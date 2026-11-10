import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";
import { buildWardReport, wardReportCsv } from "@/lib/wardReports";

function getReportFilters(params) {
  const days = Math.min(Math.max(Number(params.get("days")) || 30, 1), 365);
  const shift = params.get("shift") || "All";
  const section = params.get("section") || "All";
  if (!["All", "Early", "Late", "Night", "Day shift", "Night shift"].includes(shift)) {
    return { error: "Select a valid handover shift." };
  }
  if (section.length > 80) return { error: "Select a valid report section." };
  return { days, shift, section };
}

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Ward manager"])) {
      return NextResponse.json({ error: "Only a ward manager can view aggregate ward reports." }, { status: user ? 403 : 401 });
    }

    const filters = getReportFilters(new URL(request.url).searchParams);
    if (filters.error) return NextResponse.json({ error: filters.error }, { status: 400 });
    const report = await buildWardReport(prisma, filters);
    await writeWardAudit({
      user,
      request,
      action: "Viewed aggregate report",
      details: { days: report.periodDays, shift: report.shift, section: report.section },
    });
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Unable to build Ward 3D reports:", error);
    return NextResponse.json({ error: "Unable to build ward reports." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Ward manager"])) {
      return NextResponse.json({ error: "Only a ward manager can export aggregate ward reports." }, { status: user ? 403 : 401 });
    }
    const body = await request.json();
    const filters = getReportFilters(new URLSearchParams({
      days: String(body.days || 30),
      shift: typeof body.shift === "string" ? body.shift : "All",
      section: typeof body.section === "string" ? body.section : "All",
    }));
    if (filters.error) return NextResponse.json({ error: filters.error }, { status: 400 });
    const report = await buildWardReport(prisma, filters);
    const csv = wardReportCsv(report);
    const event = await prisma.wardAuditEvent.create({
      data: {
        actorUserId: user.id,
        actorEmail: user.email,
        action: "Exported",
        device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
        details: {
          report: "Aggregate ward report",
          days: report.periodDays,
          shift: report.shift,
          section: report.section,
          records: report.summary.totalHandovers,
          identifiersExcluded: true,
        },
      },
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ward-3d-report-${report.periodDays}-days.csv"`,
        "Cache-Control": "private, no-store",
        "X-Audit-Event": event.id,
      },
    });
  } catch (error) {
    console.error("Unable to export Ward 3D reports:", error);
    return NextResponse.json({ error: "Unable to export ward reports." }, { status: 500 });
  }
}
