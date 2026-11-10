import crypto from "crypto";
import { getSessionFromRequest } from "@/lib/authHelpers";
import { DEFAULT_WARD_SETTINGS, getWardConfiguration } from "@/lib/wardDefaults";
import prisma from "@/lib/prisma";

const roleAliases = new Map([
  ["nic", "NIC"],
  ["nurse in charge", "NIC"],
  ["nurseincharge", "NIC"],
  ["ward staff", "Ward staff"],
  ["wardstaff", "Ward staff"],
  ["ward manager", "Ward manager"],
  ["wardmanager", "Ward manager"],
  ["admin", "Admin"],
  ["administrator", "Admin"],
  ["super admin", "Super admin"],
  ["superadmin", "Super admin"],
  ["all access", "All access"],
  ["allaccess", "All access"],
  ["ig auditor", "IG auditor"],
  ["ig/auditor", "IG auditor"],
  ["igauditor", "IG auditor"],
]);

export function normalizeWardRole(role) {
  return roleAliases.get(String(role || "").trim().toLowerCase()) || null;
}

export async function getWardUser(request) {
  const session = getSessionFromRequest(request);
  if (!session?.id || !session.sessionId || !session.token) return null;

  const savedSession = await prisma.wardSession.findUnique({
    where: { id: session.sessionId },
    select: { id: true, userId: true, tokenHash: true, lastActivityAt: true, expiresAt: true },
  });
  if (!savedSession || savedSession.userId !== session.id || savedSession.expiresAt <= new Date()) return null;
  const submittedTokenHash = crypto.createHash("sha256").update(session.token).digest();
  const savedTokenHash = Buffer.from(savedSession.tokenHash, "hex");
  if (submittedTokenHash.length !== savedTokenHash.length || !crypto.timingSafeEqual(submittedTokenHash, savedTokenHash)) return null;

  const retention = await getWardConfiguration(prisma, "data-retention", DEFAULT_WARD_SETTINGS);
  const idleLimit = Math.min(Math.max(Number(retention.value?.autoLockMinutes) || DEFAULT_WARD_SETTINGS.autoLockMinutes, 1), 60) * 60 * 1000;
  if (Date.now() - savedSession.lastActivityAt.getTime() > idleLimit) {
    await prisma.wardSession.delete({ where: { id: savedSession.id } });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      staffNumber: true,
      role: true,
      accountStatus: true,
      lastSignInAt: true,
    },
  });

  if (!user || user.accountStatus !== "ACTIVE") return null;
  const wardRole = normalizeWardRole(user.role);
  if (!wardRole) return null;
  await prisma.wardSession.update({ where: { id: savedSession.id }, data: { lastActivityAt: new Date() } });
  return { ...user, wardRole };
}

export function hasWardRole(user, allowedRoles) {
  if (!user) return false;
  if (user.wardRole === "All access") return !allowedRoles.includes("Super admin");
  return allowedRoles.includes(user.wardRole);
}

export async function writeWardAudit({ user, request, action, recordId, details }) {
  return prisma.wardAuditEvent.create({
    data: {
      actorUserId: user?.id || null,
      actorEmail: user?.email || null,
      action,
      recordId: recordId || null,
      device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
      details: details || undefined,
    },
  });
}

export function jsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function parseHandoverDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}
