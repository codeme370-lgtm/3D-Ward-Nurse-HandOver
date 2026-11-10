import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/authHelpers";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";

const requestedRoles = ["Ward staff", "NIC", "Ward manager"];

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Ward manager", "Admin"])) {
      return NextResponse.json({ error: "Only an authorised ward manager or admin can review access requests." }, { status: user ? 403 : 401 });
    }

    const requests = await prisma.wardAccessRequest.findMany({
      select: {
        id: true,
        name: true,
        staffNumber: true,
        email: true,
        requestedRole: true,
        ward: true,
        approverName: true,
        status: true,
        grantedRole: true,
        decisionReason: true,
        requestedAt: true,
      },
      orderBy: { requestedAt: "desc" },
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
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const approverName = typeof body.approverName === "string" ? body.approverName.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || name.length > 120 || !staffNumber || staffNumber.length > 40 || !email || !approverName || approverName.length > 120) {
      return NextResponse.json({ error: "Enter a valid full name, staff number, NHS email and line manager." }, { status: 400 });
    }
    if (!/^[^\s@]+@nhs\.net$/i.test(email)) {
      return NextResponse.json({ error: "Use a Trust NHS email address ending in nhs.net." }, { status: 400 });
    }
    if (!requestedRoles.includes(role)) {
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
      return NextResponse.json({ error: "An account already exists for that email address or staff number. Contact your ward administrator." }, { status: 409 });
    }

    const accessRequest = await prisma.wardAccessRequest.create({
      data: {
        name,
        staffNumber,
        email,
        requestedRole: role,
        ward: "Ward 3D",
        approverName,
        passwordHash: hashPassword(password),
        trainingCompleted: true,
        confidentialityAccepted: true,
        acceptedAt: new Date(),
      },
      select: { id: true, status: true, requestedAt: true },
    });
    await writeWardAudit({
      user: null,
      request,
      action: "Access requested",
      recordId: accessRequest.id,
      details: { email, ward: "Ward 3D", device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device" },
    });
    return NextResponse.json({ request: accessRequest, message: "Your access request is awaiting approval." }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "An access request already exists for that email address or staff number." }, { status: 409 });
    }
    console.error("Unable to create Ward 3D access request:", error);
    return NextResponse.json({ error: "Unable to submit your access request." }, { status: 500 });
  }
}
