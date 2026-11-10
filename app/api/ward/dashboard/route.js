import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";

function parseJsonObject(value) {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getRecordDate(record) {
  if (!record?.handoverDate) return null;
  const date = record.handoverDate instanceof Date ? record.handoverDate : new Date(record.handoverDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractFlags(record) {
  const payload = record?.payload && typeof record.payload === "object" ? record.payload : parseJsonObject(record?.payload);
  const flags = [];
  const news = typeof payload.news === "string" ? payload.news.trim() : "";
  if (news) {
    for (const entry of news.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
      const bed = entry.match(/\bbed\s*#?\s*([a-z0-9-]+)/i)?.[1];
      flags.push({ bed: bed ? `Bed ${bed}` : "Bed not recorded", flag: "NEWS", detail: entry });
    }
  }
  const concerns = payload.concerns && typeof payload.concerns === "object" ? payload.concerns : {};
  for (const [label, entry] of Object.entries(concerns)) {
    const enabled = typeof entry === "boolean" ? entry : entry?.enabled === true;
    if (!enabled) continue;
    const detail = typeof entry === "string" ? entry : typeof entry === "object" && entry ? entry.note || entry.action || "" : "";
    const entries = String(detail).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const note of entries.length ? entries : [""]) {
      const bed = note.match(/\bbed\s*#?\s*([a-z0-9-]+)/i)?.[1];
      flags.push({ bed: bed ? `Bed ${bed}` : "Bed not recorded", flag: label, detail: note });
    }
  }
  return flags;
}

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Ward manager"])) {
      return NextResponse.json({ error: "Only a ward manager can view the ward dashboard." }, { status: user ? 403 : 401 });
    }
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const [records, recentAudit, failedSignIns] = await Promise.all([
      prisma.wardHandover.findMany({
        where: { handoverDate: { gte: sevenDaysAgo, lt: tomorrow } },
        select: { id: true, handoverDate: true, shift: true, status: true, payload: true, signedOffAt: true, nurseInChargeId: true, outgoingNicId: true },
        orderBy: [{ handoverDate: "desc" }, { shift: "asc" }],
      }),
      prisma.wardAuditEvent.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, actorUserId: true, actorEmail: true, action: true, recordId: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.wardAuditEvent.count({
        where: { action: "Failed sign-in", createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const userIds = [...new Set(records.flatMap((record) => [record.nurseInChargeId, record.outgoingNicId].filter(Boolean)))];
    const wardUsers = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const names = new Map(wardUsers.map((wardUser) => [wardUser.id, wardUser.name]));
    const normalizedRecords = records.map((record) => {
      const payload = record?.payload && typeof record.payload === "object" ? record.payload : parseJsonObject(record?.payload);
      const handoverDate = getRecordDate(record);
      return {
        ...record,
        payload,
        handoverDate,
      };
    });
    const todayRecords = normalizedRecords.filter((record) => record.handoverDate && record.handoverDate.getTime() === today.getTime());
    const activeRecords = normalizedRecords.filter((record) => record.status === "IN_PROGRESS");
    const flags = activeRecords.flatMap((record) => extractFlags(record).map((flag) => ({ ...flag, recordId: record.id, shift: record.shift })));
    const signedOff = normalizedRecords.filter((record) => record.status === "SIGNED_OFF").length;
    const completionRate = normalizedRecords.length ? Math.round((signedOff / normalizedRecords.length) * 100) : 0;
    const shiftRows = todayRecords.map((record) => ({
      id: record.id,
      shift: record.shift,
      nic: names.get(record.nurseInChargeId) || "Unknown",
      patients: Number(record.payload?.patients) || 0,
      amber: Number(record.payload?.amber) || 0,
      status: record.status,
      signedOffBy: names.get(record.outgoingNicId) || null,
      signedOffAt: record.signedOffAt,
      flags: extractFlags(record).length,
    }));
    const weeklyCompletion = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(sevenDaysAgo.getTime() + index * 24 * 60 * 60 * 1000);
      const dayRecords = normalizedRecords.filter((record) => record.handoverDate?.getTime() === day.getTime());
      const completed = dayRecords.filter((record) => record.status === "SIGNED_OFF").length;
      return {
        date: day.toISOString(),
        day: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(day),
        completed,
        total: dayRecords.length,
        expected: 3,
        rate: Math.round((completed / 3) * 100),
      };
    });
    const activityUserIds = [...new Set(recentAudit.map((event) => event.actorUserId).filter(Boolean))];
    const activityUsers = activityUserIds.length
      ? await prisma.user.findMany({ where: { id: { in: activityUserIds } }, select: { id: true, name: true } })
      : [];
    const activityNames = new Map(activityUsers.map((activityUser) => [activityUser.id, activityUser.name]));
    const recordShifts = new Map(normalizedRecords.map((record) => [record.id, record.shift]));
    const activity = recentAudit.map((event) => ({
      createdAt: event.createdAt,
      user: activityNames.get(event.actorUserId) || event.actorEmail || "Ward staff",
      action: event.action,
      shift: recordShifts.get(event.recordId) || null,
      recordId: event.recordId,
    }));

    await writeWardAudit({ user, request, action: "Viewed dashboard" });
    return NextResponse.json({
      metrics: {
        handoversToday: todayRecords.length,
        handoversExpected: 3,
        dnar: flags.filter((flag) => /dnar/i.test(flag.flag)).length,
        deteriorating: flags.filter((flag) => /news/i.test(flag.flag)).length,
        safeguarding: flags.filter((flag) => /safeguarding/i.test(flag.flag)).length,
        ttaOutstanding: activeRecords.filter((record) => {
          const payload = record.payload || {};
          return Boolean(String(payload.tta || "").trim() && !/^(no|none|n\/?a|false)$/i.test(String(payload.tta).trim()));
        }).length,
        unsigned: normalizedRecords.filter((record) => record.status !== "SIGNED_OFF").length,
        completionRate,
        failedSignIns,
      },
      shiftRows,
      flags,
      weeklyCompletion,
      recentAudit: activity,
    });
  } catch (error) {
    console.error("Unable to load Ward 3D dashboard:", error);
    return NextResponse.json({ error: "Unable to load the ward dashboard." }, { status: 500 });
  }
}
