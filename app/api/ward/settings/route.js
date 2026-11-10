import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEFAULT_WARD_SETTINGS, getWardConfiguration } from "@/lib/wardDefaults";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!user) {
      return NextResponse.json({ error: "You must sign in to view Ward 3D settings." }, { status: 401 });
    }
    const isAdmin = hasWardRole(user, ["Admin"]);
    if (!isAdmin) {
      if (hasWardRole(user, ["NIC", "Ward staff", "Ward manager", "IG auditor"])) {
        const config = await getWardConfiguration(prisma, "data-retention", DEFAULT_WARD_SETTINGS);
        await writeWardAudit({ user, request, action: "Viewed settings" });
        return NextResponse.json({
          settings: {
            autoLockMinutes: config.value.autoLockMinutes ?? DEFAULT_WARD_SETTINGS.autoLockMinutes,
          },
        });
      }
      return NextResponse.json({ error: "You do not have permission to view data and retention settings." }, { status: user ? 403 : 401 });
    }

    const config = await getWardConfiguration(prisma, "data-retention", DEFAULT_WARD_SETTINGS);
    const settings = { ...DEFAULT_WARD_SETTINGS, ...config.value };
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - settings.retentionYears);
    const [recordCount, dueCount, oldestExpiredRecord] = await Promise.all([
      prisma.wardHandover.count(),
      prisma.wardHandover.count({ where: { handoverDate: { lt: cutoff } } }),
      prisma.wardHandover.findFirst({ where: { handoverDate: { lt: cutoff } }, orderBy: { handoverDate: "asc" }, select: { handoverDate: true } }),
    ]);
    await writeWardAudit({ user, request, action: "Viewed settings" });
    return NextResponse.json({
      settings,
      version: config.version,
      recordsStored: recordCount,
      deletionCount: dueCount,
      oldestExpiredDate: oldestExpiredRecord?.handoverDate || null,
    });
  } catch (error) {
    console.error("Unable to load Ward 3D retention settings:", error);
    return NextResponse.json({ error: "Unable to load data and retention settings." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Admin"])) {
      return NextResponse.json({ error: "Only an administrator can change data and retention settings." }, { status: user ? 403 : 401 });
    }
    const body = await request.json();
    const settings = body.settings;
    if (!settings || !Number.isInteger(settings.retentionYears) || settings.retentionYears < 1 || settings.retentionYears > 30) {
      return NextResponse.json({ error: "Retention period must be between 1 and 30 years." }, { status: 400 });
    }
    if (!Number.isInteger(settings.autoLockMinutes) || settings.autoLockMinutes < 1 || settings.autoLockMinutes > 60) {
      return NextResponse.json({ error: "Automatic session lock must be between 1 and 60 minutes." }, { status: 400 });
    }
    const current = await prisma.wardConfiguration.findUnique({ where: { key: "data-retention" } });
    const version = (current?.version || 0) + 1;
    const savedSettings = {
      ...DEFAULT_WARD_SETTINGS,
      ...(current?.value && typeof current.value === "object" ? current.value : {}),
      retentionYears: settings.retentionYears,
      autoLockMinutes: settings.autoLockMinutes,
    };
    const config = await prisma.wardConfiguration.upsert({
      where: { key: "data-retention" },
      create: { key: "data-retention", value: savedSettings, version, updatedBy: user.id },
      update: { value: savedSettings, version, updatedBy: user.id },
    });
    await writeWardAudit({ user, request, action: "Settings changed", details: { key: "data-retention", version: config.version } });
    return NextResponse.json({ settings: savedSettings, version: config.version });
  } catch (error) {
    console.error("Unable to save Ward 3D retention settings:", error);
    return NextResponse.json({ error: "Unable to save data and retention settings." }, { status: 500 });
  }
}
