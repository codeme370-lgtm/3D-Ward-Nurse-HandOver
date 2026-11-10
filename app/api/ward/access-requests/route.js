import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/authHelpers";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";
import { isValidWardEmail } from "@/lib/wardEmail";

const requestedRoles = ["Ward staff", "NIC", "Ward manager"];

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
        status: true,
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
    const requestedRole = typeof body.role === "string" ? body.role.trim() : "";
    const approverName = typeof body.approverName === "string" ? body.approverName.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || name.length > 120 || !staffNumber || staffNumber.length > 40 || !isValidWardEmail(email) || !approverName || approverName.length > 120) {
      return NextResponse.json({ error: "Enter a valid full name, staff number, email address and line manager." }, { status: 400 });
    }
    if (!requestedRoles.includes(requestedRole)) {
      return NextResponse.json({ error: "Select a valid Ward 3D role." }, { status: 400 });
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must have at least 12 characters, upper and lower case, a number and a symbol." }, { status: 400 });
    }
    if (password !== body.confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    if (body.trainingCompleted !== true || body.confidentialityAccepted !== true) {
      return NextResponse.json({ error: "Complete the IG training and confidentiality confirmations before requesting access." }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { staffNumber }] },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ error: "An account already exists for that email address or staff number. Sign in or contact your administrator." }, { status: 409 });
    }

    const previousRequest = await prisma.wardAccessRequest.findFirst({
      where: { OR: [{ email }, { staffNumber }] },
      select: { id: true, email: true, staffNumber: true, status: true },
    });
    if (previousRequest && (previousRequest.email !== email || previousRequest.staffNumber !== staffNumber)) {
      return NextResponse.json({ error: "That email address or staff number is already associated with another access request." }, { status: 409 });
    }
    if (previousRequest?.status === "PENDING") {
      return NextResponse.json({ error: "An access request is already pending for that email address and staff number." }, { status: 409 });
    }
    if (previousRequest?.status === "APPROVED") {
      return NextResponse.json({ error: "This access request was already approved. Contact your administrator if you cannot sign in." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const accessRequest = await prisma.$transaction(async (transaction) => {
      const requestData = {
        name,
        staffNumber,
        email,
        requestedRole,
        ward: "Ward 3D",
        approverName,
        passwordHash,
        trainingCompleted: true,
        confidentialityAccepted: true,
        acceptedAt: new Date(),
        requestedAt: new Date(),
        status: "PENDING",
        grantedRole: null,
        decisionReason: null,
        approvedById: null,
      };
      let savedRequest;
      if (previousRequest) {
        const updated = await transaction.wardAccessRequest.updateMany({
          where: { id: previousRequest.id, status: "DECLINED" },
          data: requestData,
        });
        if (updated.count !== 1) {
          const error = new Error("This access request has already changed. Refresh and try again.");
          error.status = 409;
          throw error;
        }
        savedRequest = await transaction.wardAccessRequest.findUnique({
          where: { id: previousRequest.id },
          select: { id: true, status: true, requestedAt: true },
        });
      } else {
        savedRequest = await transaction.wardAccessRequest.create({
          data: requestData,
          select: { id: true, status: true, requestedAt: true },
        });
      }

      await transaction.wardAuditEvent.create({
        data: {
          actorEmail: email,
          action: "Access requested",
          recordId: savedRequest.id,
          device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
          details: { requestedRole, ward: "Ward 3D" },
        },
      });
      return savedRequest;
    });
    return NextResponse.json({ request: accessRequest, message: "Your access request is pending approval." }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for that email address or staff number. Sign in or contact your administrator." }, { status: 409 });
    }
    if (error?.status === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Unable to create Ward 3D access request:", error);
    return NextResponse.json({ error: "Unable to submit your access request." }, { status: 500 });
  }
}
