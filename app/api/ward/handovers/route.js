import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, jsonObject, parseHandoverDate, writeWardAudit } from "@/lib/wardAuth";
import { DEFAULT_WARD_FORM, getWardConfiguration } from "@/lib/wardDefaults";

const readRoles = ["NIC", "Ward staff", "Ward manager", "Admin"];
const shifts = ["Early", "Late", "Night", "Day shift", "Night shift"];

function getDateFromSearch(value) {
  const iso = parseHandoverDate(value);
  if (iso) return iso;
  const match = value.match(/^(\d{1,2})[\s/-]+([a-z]{3,9}|\d{1,2})[\s/-]+(\d{4})$/i);
  if (!match) return null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthText = match[2].toLowerCase();
  const monthIndex = /^\d{1,2}$/.test(monthText)
    ? Number(monthText) - 1
    : months.findIndex((month) => month.startsWith(monthText.slice(0, 3)));
  if (monthIndex < 0 || monthIndex > 11) return null;
  const day = match[1].padStart(2, "0");
  const month = String(monthIndex + 1).padStart(2, "0");
  return parseHandoverDate(`${match[3]}-${month}-${day}`);
}

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, readRoles)) {
      return NextResponse.json({ error: "You do not have permission to view handover records." }, { status: user ? 403 : 401 });
    }

    const search = new URL(request.url).searchParams;
    const id = search.get("id");
    const date = search.get("date") ? parseHandoverDate(search.get("date")) : null;
    const from = search.get("from") ? parseHandoverDate(search.get("from")) : null;
    const to = search.get("to") ? parseHandoverDate(search.get("to")) : null;
    if ((search.get("date") && !date) || (search.get("from") && !from) || (search.get("to") && !to)) {
      return NextResponse.json({ error: "Use valid YYYY-MM-DD dates for the date range." }, { status: 400 });
    }
    if (date && (from || to)) {
      return NextResponse.json({ error: "Use either an exact date or a date range, not both." }, { status: 400 });
    }
    if (from && to && from > to) {
      return NextResponse.json({ error: "The start date must be on or before the end date." }, { status: 400 });
    }
    const searchText = search.get("search")?.trim().slice(0, 120) || "";
    const searchDate = searchText ? getDateFromSearch(searchText) : null;
    const matchedUsers = searchText
      ? await prisma.user.findMany({
          where: { name: { contains: searchText, mode: "insensitive" } },
          select: { id: true },
          take: 250,
        })
      : [];
    const where = id
      ? { id }
      : {
          ...(date ? { handoverDate: date } : from || to ? {
            handoverDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          } : {}),
          ...(search.get("shift") && search.get("shift") !== "All" ? { shift: search.get("shift") } : {}),
          ...(search.get("status") && search.get("status") !== "All" ? { status: search.get("status") } : {}),
          ...(searchText ? {
            OR: [
              { id: { contains: searchText, mode: "insensitive" } },
              ...(matchedUsers.length ? [{ nurseInChargeId: { in: matchedUsers.map((item) => item.id) } }] : []),
              ...(searchDate ? [{ handoverDate: searchDate }] : []),
            ],
          } : {}),
        };
    const limit = Math.min(Math.max(Number(search.get("limit")) || 100, 1), 250);
    const page = Math.max(Number.parseInt(search.get("page") || "1", 10) || 1, 1);
    if (user.wardRole === "Ward staff" && !id && !date) {
      return NextResponse.json({ error: "Ward staff can view the current handover only." }, { status: 400 });
    }
    const [total, records] = await Promise.all([
      prisma.wardHandover.count({ where }),
      prisma.wardHandover.findMany({
      where,
      select: {
        id: true,
        handoverDate: true,
        shift: true,
        nurseInChargeId: true,
        status: true,
        payload: true,
        formVersion: true,
        outgoingNicId: true,
        incomingNicId: true,
        signedOffAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ handoverDate: "desc" }, { shift: "asc" }, { id: "asc" }],
      ...(id ? {} : { skip: (page - 1) * limit, take: limit }),
    })]);

    const userIds = [...new Set(records.flatMap((record) => [record.nurseInChargeId, record.outgoingNicId, record.incomingNicId].filter(Boolean)))];
    const wardUsers = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(wardUsers.map((wardUser) => [wardUser.id, wardUser.name]));
    const recordsWithNames = records.map((record) => ({
      ...record,
      nurseInChargeName: names.get(record.nurseInChargeId) || "Unknown",
      outgoingNicName: record.outgoingNicId ? names.get(record.outgoingNicId) || "Unknown" : null,
      incomingNicName: record.incomingNicId ? names.get(record.incomingNicId) || "Unknown" : null,
    }));

    if (id && records[0]) {
      await writeWardAudit({ user, request, action: "Opened", recordId: id });
      return NextResponse.json({ record: recordsWithNames[0] });
    }
    await writeWardAudit({
      user,
      request,
      action: "Viewed handover records",
      details: { page, pageSize: limit, total, date: date?.toISOString().slice(0, 10) || null },
    });
    return NextResponse.json({
      records: recordsWithNames,
      pagination: { page, pageSize: limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Unable to load Ward 3D handovers:", error);
    return NextResponse.json({ error: "Unable to load handover records." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["NIC"])) {
      return NextResponse.json({ error: "Only an active NIC can start a handover." }, { status: user ? 403 : 401 });
    }

    const body = await request.json();
    const handoverDate = parseHandoverDate(body.date);
    const shift = typeof body.shift === "string" ? body.shift.trim() : "";
    if (!handoverDate || !shifts.includes(shift)) {
      return NextResponse.json({ error: "Select a valid handover date and shift." }, { status: 400 });
    }

    const formConfig = await getWardConfiguration(prisma, "handover-form", DEFAULT_WARD_FORM);
    const initialPayload = { ...jsonObject(body.payload), date: body.date, shift, nic: user.name };
    for (const key of ["incomingEmail", "incomingPassword", "outgoingSigner", "incomingSigner", "signedOffAt", "formConfigSnapshot"]) {
      delete initialPayload[key];
    }
    const record = await prisma.$transaction(async (transaction) => {
      const created = await transaction.wardHandover.create({
        data: {
          handoverDate,
          shift,
          nurseInChargeId: user.id,
          payload: { ...initialPayload, formConfigSnapshot: formConfig.value },
          formVersion: String(formConfig.version),
        },
        select: {
          id: true,
          handoverDate: true,
          shift: true,
          nurseInChargeId: true,
          status: true,
          payload: true,
          formVersion: true,
          createdAt: true,
        },
      });
      await transaction.wardAuditEvent.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          action: "Opened",
          recordId: created.id,
          device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
        },
      });
      return created;
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A handover already exists for this date and shift. Open the existing record instead." }, { status: 409 });
    }
    console.error("Unable to start Ward 3D handover:", error);
    return NextResponse.json({ error: "Unable to start a new handover." }, { status: 500 });
  }
}
