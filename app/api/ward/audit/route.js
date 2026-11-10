import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";

const auditReaders = ["Ward manager", "Admin", "IG auditor"];

function getFilters(params) {
  const search = (params.get("search") || "").trim().slice(0, 120);
  const action = (params.get("action") || "All").trim();
  const userId = (params.get("user") || "All").trim();
  const days = Math.min(Math.max(Number(params.get("days")) || 7, 1), 365);
  const page = Math.max(Number.parseInt(params.get("page") || "1", 10) || 1, 1);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return { search, action, userId, days, page, since };
}

async function getAuditData(filters, { paginate = true } = {}) {
  const matchedUsers = filters.search
    ? await prisma.user.findMany({
        where: { name: { contains: filters.search, mode: "insensitive" } },
        select: { id: true },
        take: 250,
      })
    : [];
  const searchOr = filters.search ? [
    { actorEmail: { contains: filters.search, mode: "insensitive" } },
    { action: { contains: filters.search, mode: "insensitive" } },
    { recordId: { contains: filters.search, mode: "insensitive" } },
    { device: { contains: filters.search, mode: "insensitive" } },
    ...(matchedUsers.length ? [{ actorUserId: { in: matchedUsers.map((item) => item.id) } }] : []),
  ] : null;
  const where = {
    createdAt: { gte: filters.since },
    ...(filters.action !== "All" ? { action: filters.action } : {}),
    ...(filters.userId !== "All" ? { actorUserId: filters.userId } : {}),
    ...(searchOr ? { OR: searchOr } : {}),
  };
  const [total, events] = await Promise.all([
    prisma.wardAuditEvent.count({ where }),
    prisma.wardAuditEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(paginate ? { skip: (filters.page - 1) * 15, take: 15 } : {}),
    }),
  ]);
  const actorIds = [...new Set(events.flatMap((event) => {
    const details = event.details && typeof event.details === "object" ? event.details : {};
    return [event.actorUserId, details.affectedUserId, details.approvedUserId].filter((id) => typeof id === "string");
  }))];
  const recordIds = [...new Set(events.map((event) => event.recordId).filter(Boolean))];
  const [actors, handovers] = await Promise.all([
    actorIds.length ? prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [],
    recordIds.length ? prisma.wardHandover.findMany({
      where: { id: { in: recordIds } },
      select: { id: true, handoverDate: true, shift: true },
    }) : [],
  ]);
  const names = new Map(actors.map((actor) => [actor.id, actor.name]));
  const recordMap = new Map(handovers.map((record) => [record.id, record]));
  const rows = events.map((event) => {
    const record = recordMap.get(event.recordId);
    const details = event.details && typeof event.details === "object" ? event.details : {};
    let detail = record
      ? `${record.shift} handover · ${new Date(record.handoverDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`
      : event.recordId ? "Ward access request or item" : "—";
    if (event.action === "Form changed" && details.version) detail = `Form updated · v${details.version}`;
    if (event.action === "Exported") detail = `${details.report || details.export || "Data export"}${details.days ? ` · ${details.days} days` : ""}`;
    if (event.action === "Settings changed" && details.key) detail = `Updated ${details.key}`;
    if (event.action === "Role changed" && details.affectedUserId) detail = names.get(details.affectedUserId) || "User access updated";
    if (event.action === "Failed sign-in" && details.attempts) detail = `${details.attempts} attempts`;
    return {
      id: event.id,
      createdAt: event.createdAt,
      actorName: names.get(event.actorUserId) || event.actorEmail || "Unknown",
      actorUserId: event.actorUserId,
      action: event.action,
      recordId: event.recordId,
      recordLabel: detail,
      device: event.device || "—",
    };
  });
  return { rows, total, where };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, auditReaders)) {
      return NextResponse.json({ error: "You do not have permission to view the audit log." }, { status: user ? 403 : 401 });
    }

    const filters = getFilters(new URL(request.url).searchParams);
    const [data, users, actions] = await Promise.all([
      getAuditData(filters),
      prisma.user.findMany({
        where: { role: { in: ["NIC", "Ward staff", "Ward manager", "Admin", "IG auditor", "nurse in charge", "ward staff", "ward manager", "admin", "ig auditor"] } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.wardAuditEvent.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    ]);
    await writeWardAudit({ user, request, action: "Viewed log", details: { days: filters.days } });
    return NextResponse.json({
      events: data.rows,
      pagination: { page: filters.page, pageSize: 15, total: data.total, pages: Math.ceil(data.total / 15) },
      users,
      actions: actions.map((item) => item.action),
    });
  } catch (error) {
    console.error("Unable to load Ward 3D audit events:", error);
    return NextResponse.json({ error: "Unable to load the audit log." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Ward manager", "Admin"])) {
      return NextResponse.json({ error: "You do not have permission to export Ward 3D audit information." }, { status: user ? 403 : 401 });
    }
    const body = await request.json();
    if (body.export === true) {
      const filters = getFilters(new URLSearchParams({
        days: String(body.days || 7),
        search: typeof body.search === "string" ? body.search : "",
        action: typeof body.filterAction === "string" ? body.filterAction : "All",
        user: typeof body.user === "string" ? body.user : "All",
      }));
      const data = await getAuditData(filters, { paginate: false });
      const rows = [
        ["Time", "User", "Action", "Record / detail", "Device"],
        ...data.rows.map((event) => [
          new Date(event.createdAt).toLocaleString("en-GB"),
          event.actorName,
          event.action,
          event.recordLabel,
          event.device,
        ]),
      ];
      const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
      await writeWardAudit({
        user,
        request,
        action: "Exported",
        details: { export: "Audit log", days: filters.days, events: data.total },
      });
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="ward-3d-audit-log.csv"',
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (body.action !== "Exported" || typeof body.details !== "object" || !body.details) {
      return NextResponse.json({ error: "Only export audit events can be written through this endpoint." }, { status: 400 });
    }
    const event = await writeWardAudit({
      user,
      request,
      action: "Exported",
      recordId: typeof body.recordId === "string" ? body.recordId : null,
      details: body.details,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Unable to export Ward 3D audit events:", error);
    return NextResponse.json({ error: "Unable to export Ward 3D audit information." }, { status: 500 });
  }
}
