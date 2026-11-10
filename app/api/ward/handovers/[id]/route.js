import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, jsonObject, normalizeWardRole, writeWardAudit } from "@/lib/wardAuth";
import { verifyPassword } from "@/lib/authHelpers";
import { buildHandoverPdf } from "@/lib/wardPdf";

const handoverReaders = ["NIC", "Ward staff", "Ward manager"];
const requiredChecks = [
  "newsPatientsDiscussed",
  "dnarAndPalliativeConfirmed",
  "safeguardingHandedOver",
  "resusTrolleyChecked",
  "controlledDrugsChecked",
  "ttasAndTransportNoted",
];

export async function GET(request, { params }) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, handoverReaders)) {
      return NextResponse.json({ error: "You do not have permission to view this handover." }, { status: user ? 403 : 401 });
    }
    const { id } = await params;
    const record = await prisma.wardHandover.findUnique({
      where: { id },
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
    });
    if (!record) return NextResponse.json({ error: "Handover not found." }, { status: 404 });
    await writeWardAudit({ user, request, action: "Opened", recordId: id });
    return NextResponse.json({ record });
  } catch (error) {
    console.error("Unable to open Ward 3D handover:", error);
    return NextResponse.json({ error: "Unable to open this handover." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["NIC"])) {
      return NextResponse.json({ error: "Only an active NIC or All access account can edit a handover." }, { status: user ? 403 : 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const record = await prisma.wardHandover.findUnique({
      where: { id },
      select: { id: true, status: true, nurseInChargeId: true, payload: true, updatedAt: true },
    });
    if (!record) return NextResponse.json({ error: "Handover not found." }, { status: 404 });
    const canEditAnyHandover = user.wardRole === "All access";
    if (record.nurseInChargeId !== user.id && !canEditAnyHandover) {
      return NextResponse.json({ error: "Only the NIC who started this handover can edit it." }, { status: 403 });
    }
    if (record.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Signed-off handovers are locked and cannot be edited." }, { status: 409 });
    }
    if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
      return NextResponse.json({ error: "A valid handover payload is required." }, { status: 400 });
    }
    const payload = { ...jsonObject(record.payload), ...jsonObject(body.payload) };
    for (const key of ["incomingEmail", "incomingPassword", "outgoingSigner", "incomingSigner", "signedOffAt", "formConfigSnapshot"]) {
      if (key === "incomingEmail" || key === "incomingPassword") {
        delete payload[key];
      } else if (key in jsonObject(record.payload)) {
        payload[key] = record.payload[key];
      } else {
        delete payload[key];
      }
    }
    const saved = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.wardHandover.updateMany({
        where: {
          id,
          ...(!canEditAnyHandover ? { nurseInChargeId: user.id } : {}),
          status: "IN_PROGRESS",
          updatedAt: record.updatedAt,
        },
        data: { payload },
      });
      if (updated.count !== 1) return false;
      await transaction.wardAuditEvent.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          action: "Edited",
          recordId: id,
          device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
        },
      });
      return true;
    });
    if (!saved) {
      return NextResponse.json({ error: "This handover was changed or signed off by another session. Reload the record before continuing." }, { status: 409 });
    }
    return NextResponse.json({ record: { id, status: "IN_PROGRESS" } });
  } catch (error) {
    console.error("Unable to save Ward 3D handover:", error);
    return NextResponse.json({ error: "Unable to save the handover." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["NIC"])) {
      return NextResponse.json({ error: "Only an active NIC or All access account can sign off a handover." }, { status: user ? 403 : 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const incomingEmail = typeof body.incomingEmail === "string" ? body.incomingEmail.trim().toLowerCase() : "";
    const incomingPassword = typeof body.incomingPassword === "string" ? body.incomingPassword : "";
    const record = await prisma.wardHandover.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: "Handover not found." }, { status: 404 });
    const canEditAnyHandover = user.wardRole === "All access";
    if (record.nurseInChargeId !== user.id && !canEditAnyHandover) {
      return NextResponse.json({ error: "Only the NIC who started this handover can sign it off." }, { status: 403 });
    }
    if (record.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "This handover has already been signed off and locked." }, { status: 409 });
    }

    const incoming = await prisma.user.findUnique({ where: { email: incomingEmail } });
    if (!incoming || incoming.accountStatus !== "ACTIVE" || !verifyPassword(incomingPassword, incoming.password)) {
      return NextResponse.json({ error: "The incoming NIC credentials could not be verified." }, { status: 401 });
    }
    if (incoming.id === user.id || normalizeWardRole(incoming.role) !== "NIC") {
      return NextResponse.json({ error: "A different active NIC must sign in to confirm the incoming handover." }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const current = await transaction.wardHandover.findUnique({ where: { id } });
      if (!current || current.status !== "IN_PROGRESS" || (!canEditAnyHandover && current.nurseInChargeId !== user.id)) return { conflict: true };
      const payload = jsonObject(current.payload);
      const checks = jsonObject(payload.checks);
      const missingChecks = requiredChecks.filter((check) => checks[check] !== true);
      if (missingChecks.length) return { missingChecks };

      const signedOffAt = new Date();
      const signedPayload = {
        ...payload,
        outgoingSigner: user.name,
        incomingSigner: incoming.name,
        signedOffAt: signedOffAt.toISOString(),
      };
      const pdfRecord = { ...current, payload: signedPayload, status: "SIGNED_OFF", signedOffAt };
      const pdfData = buildHandoverPdf(pdfRecord);
      const saved = await transaction.wardHandover.updateMany({
        where: {
          id,
          ...(!canEditAnyHandover ? { nurseInChargeId: user.id } : {}),
          status: "IN_PROGRESS",
          updatedAt: current.updatedAt,
        },
        data: {
          status: "SIGNED_OFF",
          payload: signedPayload,
          outgoingNicId: user.id,
          incomingNicId: incoming.id,
          signedOffAt,
          pdfData,
          pdfGeneratedAt: signedOffAt,
        },
      });
      if (saved.count !== 1) return { conflict: true };
      const savedRecord = await transaction.wardHandover.findUnique({
        where: { id },
        select: { id: true, status: true, signedOffAt: true, outgoingNicId: true, incomingNicId: true },
      });
      await transaction.wardAuditEvent.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          action: "Signed off",
          recordId: id,
          device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
          details: { incomingNicId: incoming.id, pdfGenerated: true },
        },
      });
      return { record: savedRecord };
    });
    if (updated.conflict) {
      return NextResponse.json({ error: "This handover was changed or signed off by another session. Reload the record before continuing." }, { status: 409 });
    }
    if (updated.missingChecks) {
      return NextResponse.json({ error: "Complete all six safety checks before signing off.", missingChecks: updated.missingChecks }, { status: 400 });
    }
    return NextResponse.json({
      record: {
        ...updated.record,
        outgoingNicName: user.name,
        incomingNicName: incoming.name,
      },
      message: "Handover signed off, locked and saved with its PDF.",
    });
  } catch (error) {
    console.error("Unable to sign off Ward 3D handover:", error);
    return NextResponse.json({ error: "Unable to complete sign-off." }, { status: 500 });
  }
}
