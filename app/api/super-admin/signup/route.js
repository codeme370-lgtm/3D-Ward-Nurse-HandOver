import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/authHelpers";
import { getConfiguredAdminEmail, verifySuperAdminSignupSecret } from "@/lib/superAdmin";
import { isValidWardEmail } from "@/lib/wardEmail";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const adminEmail = getConfiguredAdminEmail();
    if (!adminEmail || !process.env.SUPER_ADMIN_SIGNUP_SECRET || process.env.SUPER_ADMIN_SIGNUP_SECRET.length < 32) {
      return NextResponse.json({ error: "Super Admin signup is not configured. Set ADMIN_EMAIL and a 32-character SUPER_ADMIN_SIGNUP_SECRET." }, { status: 503 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const signupSecret = typeof body.signupSecret === "string" ? body.signupSecret : "";

    if (!name || name.length > 120 || !isValidWardEmail(email) || email !== adminEmail) {
      return NextResponse.json({ error: "Use the configured administrator email address and a valid name." }, { status: 400 });
    }
    if (!verifySuperAdminSignupSecret(signupSecret)) {
      return NextResponse.json({ error: "The Super Admin setup secret is invalid." }, { status: 401 });
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must have at least 12 characters, upper and lower case, a number and a symbol." }, { status: 400 });
    }
    if (password !== body.confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: { in: ["Super admin", "super admin", "superadmin"] } },
      select: { id: true },
    });
    if (existingSuperAdmin) {
      return NextResponse.json({ error: "Super Admin setup has already been completed. Sign in with the configured administrator account." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: { name, email, password: passwordHash, role: "Super admin", accountStatus: "ACTIVE" },
        select: { id: true },
      });
      await transaction.wardAuditEvent.create({
        data: {
          actorUserId: createdUser.id,
          actorEmail: email,
          action: "Super Admin account created",
          device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
          details: { email },
        },
      });
      return createdUser;
    });

    return NextResponse.json({ message: "Super Admin account created. Sign in using the regular sign-in page." }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for the configured administrator email." }, { status: 409 });
    }
    console.error("Unable to create the Super Admin account:", error);
    return NextResponse.json({ error: "Unable to complete Super Admin signup." }, { status: 500 });
  }
}
