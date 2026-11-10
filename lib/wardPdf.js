const sectionLabels = {
  patients: "Patients on ward",
  emptyBeds: "Empty beds",
  amber: "Amber / at risk",
  discharge: "For discharge",
  staffing: "Staffing / skill mix concerns",
  news: "Unwell / deteriorating (NEWS)",
  concerns: "Clinical and safeguarding concerns",
  surgery: "Pre / post surgery",
  labs: "Labs and infusion",
  vascular: "Vascular access",
  feeds: "External feed",
  governance: "Governance and safety",
  medications: "Medications and discharges",
  transport: "Transport",
  additional: "Additional note",
  incomingNotes: "Notes for incoming NIC",
};

const checkLabels = {
  newsPatientsDiscussed: "NEWS patients discussed",
  dnarAndPalliativeConfirmed: "DNAR and palliative patients confirmed",
  safeguardingHandedOver: "Safeguarding concerns handed over",
  resusTrolleyChecked: "Resuscitation trolley checked and sealed",
  controlledDrugsChecked: "Controlled drugs checked",
  ttasAndTransportNoted: "Outstanding TTAs and transport noted",
};

function printableText(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(value, width = 88) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function flattenPayload(value, prefix = "") {
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "boolean") return [`${prefix}: ${value ? "Yes" : "No"}`];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenPayload(item, `${prefix} ${index + 1}`));
  }
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => {
      if (["checks", "formConfigSnapshot", "concernNotes", "incomingEmail", "incomingPassword", "outgoingSigner", "incomingSigner", "signedOffAt", "date", "shift", "nic"].includes(key)) return [];
      if (key === "concerns") {
        return Object.entries(item || {}).flatMap(([concern, entry]) => {
          const enabled = entry === true || entry?.enabled === true;
          if (!enabled) return [];
          const note = typeof entry === "object" && entry ? entry.note || entry.action : "";
          return [`Concern: ${concern}${note ? ` · ${note}` : ""}`];
        });
      }
      const label = sectionLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
      return flattenPayload(item, prefix ? `${prefix} · ${label}` : label);
    });
  }
  return [`${prefix}: ${String(value)}`];
}

function pdfStream(lines) {
  const commands = ["BT", "/F1 10 Tf", "48 790 Td", "14 TL"];
  for (const line of lines) commands.push(`(${printableText(line)}) Tj`, "T*");
  commands.push("ET");
  return commands.join("\n");
}

export function buildTextPdf(textLines) {
  const lines = textLines.flatMap((line) => (line ? wrapLine(line) : [""]));
  const pageLines = [];
  for (let index = 0; index < lines.length; index += 50) pageLines.push(lines.slice(index, index + 50));
  if (pageLines.length === 0) pageLines.push(["Ward 3D report"]);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageLines.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pageLines.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  for (let index = 0; index < pageLines.length; index += 1) {
    const pageObject = 4 + index * 2;
    const streamObject = pageObject + 1;
    const stream = pdfStream(pageLines[index]);
    objects.push(`<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R >> >> /MediaBox [0 0 595 842] /Contents ${streamObject} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
  }

  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output, "ascii"));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(output, "ascii");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(output, "ascii");
}

export function buildHandoverPdf(record) {
  const payload = record.payload && typeof record.payload === "object" ? record.payload : {};
  const checks = payload.checks && typeof payload.checks === "object" ? payload.checks : {};
  const lines = [
    "BARTS HEALTH NHS TRUST - WARD 3D",
    "NIC SAFETY BRIEFING & HANDOVER",
    "",
    `Date: ${record.handoverDate.toISOString().slice(0, 10)}    Shift: ${record.shift}`,
    `Nurse in charge: ${payload.nic || "Not recorded"}`,
    `Status: ${record.status === "SIGNED_OFF" ? "Signed off" : record.status}`,
    "",
    "PATIENT IDENTIFIERS: BED NUMBERS ONLY",
    "",
    ...flattenPayload(payload),
    "",
    "CHECKS BEFORE SIGN-OFF",
    ...Object.entries(checks).map(([label, checked]) => `${checked ? "[x]" : "[ ]"} ${checkLabels[label] || label}`),
    "",
    `Outgoing NIC: ${payload.outgoingSigner || "Not recorded"}`,
    `Incoming NIC: ${payload.incomingSigner || "Not recorded"}`,
    `Signed off: ${record.signedOffAt ? record.signedOffAt.toISOString() : "Not signed off"}`,
  ];

  return buildTextPdf(lines);
}
