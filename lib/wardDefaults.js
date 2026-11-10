export const DEFAULT_WARD_FORM = {
  version: 1,
  concerns: [
    "DNAR",
    "Palliative Patient",
    "Fast Track",
    "Red Tray",
    "Falls Risk",
    "Confusion / Delirium",
    "Enhance Care",
    "Mental Health Pt",
    "Disability",
    "Learning Disability",
    "Care Giver",
    "Adolescent",
    "Forms Completed",
    "Guardian / Parent",
    "Pressure Damage",
    "Infection Control",
    "Safeguarding",
  ].map((label, index) => ({ id: `concern-${index + 1}`, label, enabled: true })),
  sections: [
    "Patient & Staffing Overview",
    "Unwell / Deteriorating (NEWS)",
    "Clinical & Safeguarding Concerns",
    "Equipment & Safety Checks",
    "Appointments / Transport",
    "Mobility / Surgical Instructions",
    "Pre & Post Surgery",
    "Labs & Infusion",
    "Governance & Safety",
    "Vascular Access",
    "External Feed",
    "Medications & Discharges",
    "TTA",
  ].map((label, index) => ({ id: `section-${index + 1}`, label, enabled: true })),
  shifts: ["Early", "Late", "Night"],
  wards: ["3D"],
};

export const DEFAULT_WARD_SETTINGS = {
  retentionYears: 8,
  autoLockMinutes: 2,
  blockScreenshots: true,
  hideIdentifiersInExports: true,
  requireIncomingNicSignoff: true,
  useBedNumbers: true,
  twoFactorForAdmins: true,
  dailyBackupTime: "02:00",
  emailUnsignedHandoverAlerts: false,
};

export async function getWardConfiguration(prisma, key, fallback) {
  const config = await prisma.wardConfiguration.findUnique({ where: { key } });
  return config || { value: fallback, version: 1 };
}
