import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/authHelpers";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";
import { isValidWardEmail } from "@/lib/wardEmail";

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Ward manager", "Admin"])) {
      return NextResponse.json({ error: "Only an authorised ward manager or admin can review access requests." }, { status: user ? 403 : 401 });
    }

    const requests = await prisma.wardAccessRequest.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        name: true,
        staffNumber: true,
        email: true,
        requestedRole: true,
        ward: true,
        approverName: true,
        requestedAt: true,
      },
      orderBy: { requestedAt: "asc" },
    });
    await writeWardAudit({ user, request, action: "Viewed access requests" });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Unable to load Ward 3D access requests:", error);
    return NextResponse.json({ error: "Unable to load access requests." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const staffNumber = typeof body.staffNumber === "string" ? body.staffNumber.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || name.length > 120 || !staffNumber || staffNumber.length > 40 || !isValidWardEmail(email)) {
      return NextResponse.json({ error: "Enter a valid full name, staff number and email address." }, { status: 400 });
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must have at least 12 characters, upper and lower case, a number and a symbol." }, { status: 400 });
    }
    if (password !== body.confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    if (body.trainingCompleted !== true || body.confidentialityAccepted !== true) {
      return NextResponse.json({ error: "Complete the IG training and confidentiality confirmations before creating your account." }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { staffNumber }] },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ error: "An account already exists for that email address or staff number. Sign in or contact your administrator." }, { status: 409 });
    }

    const pendingRequest = await prisma.wardAccessRequest.findFirst({
      where: { OR: [{ email }, { staffNumber }], status: "PENDING" },
      select: { id: true, email: true, staffNumber: true },
    });
    if (pendingRequest && (pendingRequest.email !== email || pendingRequest.staffNumber !== staffNumber)) {
      return NextResponse.json({ error: "A pending access request already uses that email address or staff number. Contact your administrator." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const createdUser = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name,
          staffNumber,
          email,
          password: passwordHash,
          role: "Ward staff",
          accountStatus: "ACTIVE",
        },
        select: { id: true, name: true, email: true, staffNumber: true, role: true, accountStatus: true },
      });

      if (pendingRequest) {
        await transaction.wardAccessRequest.update({
          where: { id: pendingRequest.id },
          data: {
            status: "APPROVED",
            grantedRole: "Ward staff",
            decisionReason: "Account activated immediately at sign-up",
          },
        });
      }

      await transaction.wardAuditEvent.create({
        data: {
          actorEmail: email,
          action: "Account created",
          device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
          details: { role: "Ward staff", ward: "Ward 3D" },
        },
      });
      return user;
    });
    return NextResponse.json({ user: createdUser, message: "Your account is active. You can sign in now." }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for that email address or staff number. Sign in or contact your administrator." }, { status: 409 });
    }
    console.error("Unable to create Ward 3D access request:", error);
    return NextResponse.json({ error: "Unable to create your account." }, { status: 500 });
  }
}
