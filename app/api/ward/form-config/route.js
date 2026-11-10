import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEFAULT_WARD_FORM, getWardConfiguration } from "@/lib/wardDefaults";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["NIC", "Ward staff", "Ward manager", "Admin"])) {
      return NextResponse.json({ error: "You do not have permission to load the handover form." }, { status: user ? 403 : 401 });
    }
    const canManage = hasWardRole(user, ["Admin"]);
    const [config, draft, historyEvents] = await Promise.all([
      getWardConfiguration(prisma, "handover-form", DEFAULT_WARD_FORM),
      canManage ? prisma.wardConfiguration.findUnique({ where: { key: "handover-form-draft" } }) : null,
      canManage ? prisma.wardAuditEvent.findMany({
        where: { action: "Form changed" },
        select: { id: true, actorUserId: true, actorEmail: true, createdAt: true, details: true },
        orderBy: { createdAt: "desc" },
        take: 7,
      }) : [],
    ]);
    const actorIds = [...new Set(historyEvents.map((event) => event.actorUserId).filter(Boolean))];
    const actors = actorIds.length
      ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const actorNames = new Map(actors.map((actor) => [actor.id, actor.name]));
    await writeWardAudit({ user, request, action: "Viewed form configuration" });
    return NextResponse.json({
      form: config.value,
      version: config.version,
      draft: draft?.value || null,
      draftUpdatedAt: draft?.updatedAt || null,
      history: historyEvents.map((event) => ({
        id: event.id,
        version: event.details?.version || null,
        changedAt: event.createdAt,
        by: actorNames.get(event.actorUserId) || event.actorEmail || "Ward administrator",
      })),
    });
  } catch (error) {
    console.error("Unable to load Ward 3D form configuration:", error);
    return NextResponse.json({ error: "Unable to load handover form configuration." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Admin"])) {
      return NextResponse.json({ error: "Only an administrator can publish form settings." }, { status: user ? 403 : 401 });
    }
    const body = await request.json();
    if (body.discardDraft === true) {
      await prisma.wardConfiguration.deleteMany({ where: { key: "handover-form-draft" } });
      await writeWardAudit({ user, request, action: "Form draft discarded" });
      return NextResponse.json({ draft: null, message: "Saved draft discarded." });
    }
    const form = body.form;
    if (!form || !Array.isArray(form.concerns) || !Array.isArray(form.sections) || !Array.isArray(form.shifts)) {
      return NextResponse.json({ error: "Form settings require concerns, sections and shifts." }, { status: 400 });
    }
    if (form.concerns.length > 50 || form.sections.length > 30 || form.shifts.length > 6) {
      return NextResponse.json({ error: "Form settings exceed the supported section or option limits." }, { status: 400 });
    }
    if (
      form.concerns.some((item) => !item || typeof item.id !== "string" || typeof item.label !== "string" || !item.label.trim() || item.label.length > 80 || typeof item.enabled !== "boolean") ||
      form.sections.some((item) => !item || typeof item.id !== "string" || typeof item.label !== "string" || !item.label.trim() || item.label.length > 100 || typeof item.enabled !== "boolean") ||
      form.shifts.some((shift) => typeof shift !== "string" || !["Early", "Late", "Night"].includes(shift)) ||
      !form.shifts.length ||
      (form.wards !== undefined && (!Array.isArray(form.wards) || form.wards.some((ward) => typeof ward !== "string" || !ward.trim() || ward.length > 40)))
    ) {
      return NextResponse.json({ error: "Check concern, section, shift and ward values before saving." }, { status: 400 });
    }

    const current = await prisma.wardConfiguration.findUnique({ where: { key: "handover-form" } });
    if (body.draft === true) {
      const savedDraft = await prisma.wardConfiguration.upsert({
        where: { key: "handover-form-draft" },
        create: { key: "handover-form-draft", value: form, version: current?.version || 1, updatedBy: user.id },
        update: { value: form, version: current?.version || 1, updatedBy: user.id },
      });
      await writeWardAudit({ user, request, action: "Form draft saved" });
      return NextResponse.json({ draft: savedDraft.value, updatedAt: savedDraft.updatedAt });
    }
    const version = (current?.version || 0) + 1;
    const versionedForm = { ...form, version };
    const saved = await prisma.wardConfiguration.upsert({
      where: { key: "handover-form" },
      create: { key: "handover-form", value: versionedForm, version, updatedBy: user.id },
      update: {
        value: versionedForm,
        version,
        updatedBy: user.id,
      },
    });
    await writeWardAudit({ user, request, action: "Form changed", details: { version: saved.version } });
    await prisma.wardConfiguration.deleteMany({ where: { key: "handover-form-draft" } });
    return NextResponse.json({ form: versionedForm, version: saved.version });
  } catch (error) {
    console.error("Unable to save Ward 3D form configuration:", error);
    return NextResponse.json({ error: "Unable to save form settings." }, { status: 500 });
  }
}
