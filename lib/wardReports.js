function getConcernLabels(payload) {
  const concerns = payload?.concerns && typeof payload.concerns === "object" ? payload.concerns : {};
  return Object.entries(concerns)
    .filter(([, value]) => value === true || value?.enabled === true)
    .map(([label]) => label);
}

function hasReportableEntry(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  const text = String(value).trim();
  return Boolean(text) && !/^(no|none|n\/?a|false)$/i.test(text);
}

function getIncidentCategory(payload) {
  const governance = payload.governanceDetails && typeof payload.governanceDetails === "object" ? payload.governanceDetails : {};
  const category = payload.datixCategory || payload.incidentCategory;
  if (hasReportableEntry(category)) return String(category).slice(0, 60);
  if (!hasReportableEntry(governance.incidentReport) && !hasReportableEntry(governance.datixReference) && !hasReportableEntry(payload.governance)) return null;
  const incidentText = `${governance.incidentReport || ""} ${governance.datixReference || ""} ${payload.governance || ""}`;
  if (/fall/i.test(incidentText)) return "Falls";
  if (/medicat|drug/i.test(incidentText)) return "Medication";
  if (/pressure/i.test(incidentText)) return "Pressure damage";
  return "Other";
}

export async function buildWardReport(prisma, { days = 30, shift = "All", section = "All" } = {}) {
  const periodDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (periodDays - 1));
  const records = await prisma.wardHandover.findMany({
    where: {
      handoverDate: { gte: since },
      ...(shift !== "All" ? { shift } : {}),
    },
    select: { id: true, handoverDate: true, shift: true, status: true, payload: true },
    orderBy: { handoverDate: "asc" },
  });

  const concernCounts = new Map();
  const incidentCategories = new Map();
  let complaintCount = 0;
  let patientTotal = 0;
  let patientCount = 0;
  let occupiedBeds = 0;
  let recordedBeds = 0;
  const weekCounts = new Map();

  for (const record of records) {
    const payload = record.payload && typeof record.payload === "object" ? record.payload : {};
    for (const label of getConcernLabels(payload)) {
      if (section !== "All" && section !== label) continue;
      concernCounts.set(label, (concernCounts.get(label) || 0) + 1);
    }

    const governance = payload.governanceDetails && typeof payload.governanceDetails === "object" ? payload.governanceDetails : {};
    if (hasReportableEntry(governance.complaint) || hasReportableEntry(payload.complaint)) complaintCount += 1;
    const incidentCategory = getIncidentCategory(payload);
    if (incidentCategory) incidentCategories.set(incidentCategory, (incidentCategories.get(incidentCategory) || 0) + 1);

    const patients = Number(payload.patients);
    if (payload.patients !== "" && payload.patients != null && Number.isFinite(patients) && patients >= 0) {
      patientTotal += patients;
      patientCount += 1;
    }
    const emptyBeds = Number(payload.emptyBeds);
    if (
      payload.patients !== "" && payload.patients != null && Number.isFinite(patients) && patients >= 0 &&
      payload.emptyBeds !== "" && payload.emptyBeds != null && Number.isFinite(emptyBeds) && emptyBeds >= 0
    ) {
      occupiedBeds += patients;
      recordedBeds += patients + emptyBeds;
    }
    const weekStart = new Date(record.handoverDate);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const week = weekStart.toISOString().slice(0, 10);
    const entry = weekCounts.get(week) || { week, completed: 0, total: 0 };
    entry.total += 1;
    if (record.status === "SIGNED_OFF") entry.completed += 1;
    weekCounts.set(week, entry);
  }

  const signedOff = records.filter((record) => record.status === "SIGNED_OFF").length;
  const incidents = [...incidentCategories.values()].reduce((sum, count) => sum + count, 0);
  return {
    periodDays,
    shift,
    section,
    summary: {
      completionRate: records.length ? Math.round((signedOff / records.length) * 100) : 0,
      signedOff,
      totalHandovers: records.length,
      incidents,
      complaints: complaintCount,
      averagePatientsPerShift: patientCount ? Number((patientTotal / patientCount).toFixed(1)) : 0,
      occupancyRate: recordedBeds ? Math.round((occupiedBeds / recordedBeds) * 100) : 0,
    },
    concernCounts: [...concernCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    incidentCategories: [...incidentCategories.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    weeklyCompletion: [...weekCounts.values()].sort((a, b) => a.week.localeCompare(b.week)),
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function wardReportCsv(report) {
  const rows = [
    ["Report", "Ward 3D aggregate handover report"],
    ["Period (days)", String(report.periodDays)],
    ["Shift", report.shift],
    ["Section", report.section],
    ["Total handovers", String(report.summary.totalHandovers)],
    ["Signed off", String(report.summary.signedOff)],
    ["Completion rate (%)", String(report.summary.completionRate)],
    ["Incidents (Datix)", String(report.summary.incidents)],
    ["Complaints", String(report.summary.complaints)],
    ["Average patients per shift", String(report.summary.averagePatientsPerShift)],
    ["Occupancy rate (%)", String(report.summary.occupancyRate)],
    [],
    ["Concern category", "Count"],
    ...report.concernCounts.map(({ label, count }) => [label, String(count)]),
    [],
    ["Incident category", "Count"],
    ...report.incidentCategories.map(({ label, count }) => [label, String(count)]),
    [],
    ["Week starting", "Completed", "Total"],
    ...report.weeklyCompletion.map(({ week, completed, total }) => [week, String(completed), String(total)]),
  ];
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}
