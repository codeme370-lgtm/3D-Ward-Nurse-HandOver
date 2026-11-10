import crypto from "crypto";
import { isValidWardEmail } from "@/lib/wardEmail";

export function getConfiguredAdminEmail() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return isValidWardEmail(email) ? email : null;
}

export function verifySuperAdminSignupSecret(candidate) {
  const configuredSecret = process.env.SUPER_ADMIN_SIGNUP_SECRET;
  if (typeof candidate !== "string" || !configuredSecret || configuredSecret.length < 32) return false;
  const candidateBuffer = Buffer.from(candidate);
  const configuredBuffer = Buffer.from(configuredSecret);
  return candidateBuffer.length === configuredBuffer.length && crypto.timingSafeEqual(candidateBuffer, configuredBuffer);
}
