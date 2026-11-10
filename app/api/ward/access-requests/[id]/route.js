import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";

const allowedRoles = ["Ward staff", "NIC", "Ward manager"];

export async function PATCH(request, { params }) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Ward manager", "Admin"])) {
      return NextResponse.json({ error: "Only an authorised ward manager or admin can decide access requests." }, { status: user ? 403 : 401 });
    }

    const { id } = await params;
    const body = await request.json();
    if (!["APPROVE", "DECLINE"].includes(body.decision)) {
      return NextResponse.json({ error: "Select approve or decline." }, { status: 400 });
    }

    const accessRequest = await prisma.wardAccessRequest.findUnique({ where: { id } });
    if (!accessRequest || accessRequest.status !== "PENDING") {
      return NextResponse.json({ error: "This access request is no longer pending." }, { status: 404 });
    }

    if (body.decision === "DECLINE") {
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
      await prisma.$transaction([
        prisma.wardAccessRequest.update({
          where: { id },
          data: { status: "DECLINED", decisionReason: reason || "Declined by approver", approvedById: user.id },
        }),
        prisma.wardAuditEvent.create({
          data: {
            actorUserId: user.id,
            actorEmail: user.email,
            action: "Access declined",
            recordId: id,
            device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
            details: { reason: reason || "Declined by approver", requestedRole: accessRequest.requestedRole },
          },
        }),
      ]);
      return NextResponse.json({ message: "Access request declined." });
    }

    const grantedRole = typeof body.grantedRole === "string" ? body.grantedRole : accessRequest.requestedRole;
    if (!allowedRoles.includes(grantedRole) || (grantedRole === "Ward manager" && user.wardRole !== "Admin")) {
      return NextResponse.json({ error: "You cannot grant the selected role." }, { status: 403 });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name: accessRequest.name,
          email: accessRequest.email,
          staffNumber: accessRequest.staffNumber,
          password: accessRequest.passwordHash,
          role: grantedRole,
          accountStatus: "ACTIVE",
        },
        select: { id: true, name: true, email: true, staffNumber: true, role: true, accountStatus: true },
      });
      await transaction.wardAccessRequest.update({
        where: { id },
        data: { status: "APPROVED", grantedRole, approvedById: user.id },
      });
      await transaction.wardAuditEvent.create({
        data: {
          actorUserId: user.id,
          actorEmail: user.email,
          action: "Role changed",
          recordId: id,
          device: request.headers.get("user-agent")?.slice(0, 250) || "Unknown device",
          details: { grantedRole, requestedRole: accessRequest.requestedRole, approvedUserId: createdUser.id },
        },
      });
      return createdUser;
    });

    return NextResponse.json({ user: result, message: "Access approved. The account is now active." });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for this email or staff number." }, { status: 409 });
    }
    console.error("Unable to decide Ward 3D access request:", error);
    return NextResponse.json({ error: "Unable to process this access request." }, { status: 500 });
  }
}
