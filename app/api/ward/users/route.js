import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/authHelpers";
import { getWardUser, hasWardRole, normalizeWardRole, writeWardAudit } from "@/lib/wardAuth";
import { isValidWardEmail } from "@/lib/wardEmail";

const wardRoles = ["NIC", "Ward staff", "Ward manager", "Admin", "IG auditor"];

export async function GET(request) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["Admin"])) {
      return NextResponse.json({ error: "Only an administrator can manage Ward 3D users." }, { status: user ? 403 : 401 });
    }

    const users = await prisma.user.findMany({
      where: { role: { in: ["NIC", "Ward staff", "Ward manager", "Admin", "IG auditor", "All access", "nurse in charge", "ward staff", "ward manager", "admin", "ig auditor", "all access"] } },
      select: { id: true, name: true, email: true, staffNumber: true, role: true, accountStatus: true, lastSignInAt: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    await writeWardAudit({ user, request, action: "Viewed users" });
    return NextResponse.json({ users: users.map((item) => ({ ...item, role: normalizeWardRole(item.role) })) });
  } catch (error) {
    console.error("Unable to load Ward 3D users:", error);
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const actor = await getWardUser(request);
    if (!hasWardRole(actor, ["Admin"])) {
      return NextResponse.json({ error: "Only an administrator can create Ward 3D users." }, { status: actor ? 403 : 401 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const staffNumber = typeof body.staffNumber === "string" ? body.staffNumber.trim() : "";
    const role = typeof body.role === "string" ? body.role : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || name.length > 120 || !isValidWardEmail(email) || staffNumber.length > 40 || !wardRoles.includes(role)) {
      return NextResponse.json({ error: "Enter a valid name, email address, staff number and Ward 3D role." }, { status: 400 });
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must have at least 12 characters, upper and lower case, a number and a symbol." }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        ...(staffNumber ? { staffNumber } : {}),
        role,
        password: hashPassword(password),
        accountStatus: "ACTIVE",
      },
      select: { id: true, name: true, email: true, staffNumber: true, role: true, accountStatus: true, lastSignInAt: true },
    });
    await writeWardAudit({
      user: actor,
      request,
      action: "User created",
      details: { affectedUserId: user.id, role: user.role },
    });
    return NextResponse.json({ user: { ...user, role: normalizeWardRole(user.role) } }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for that email address or staff number." }, { status: 409 });
    }
    console.error("Unable to create Ward 3D user:", error);
    return NextResponse.json({ error: "Unable to create this user." }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const actor = await getWardUser(request);
    if (!hasWardRole(actor, ["Admin"])) {
      return NextResponse.json({ error: "Only an administrator can change Ward 3D user roles." }, { status: actor ? 403 : 401 });
    }
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const action = typeof body.action === "string" ? body.action : "";
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || !normalizeWardRole(target.role)) {
      return NextResponse.json({ error: "Ward 3D user not found." }, { status: 404 });
    }
    if (target.id === actor.id && (action === "disable" || (action === "role" && body.role !== "Admin"))) {
      return NextResponse.json({ error: "You cannot disable your own account or remove your administrator role." }, { status: 400 });
    }

    let updated;
    if (action === "disable" || action === "enable") {
      updated = await prisma.user.update({
        where: { id },
        data: { accountStatus: action === "disable" ? "DISABLED" : "ACTIVE" },
        select: { id: true, name: true, email: true, role: true, accountStatus: true, lastSignInAt: true },
      });
    } else if (action === "role") {
      const newRole = typeof body.role === "string" ? body.role : "";
      if (!["NIC", "Ward staff", "Ward manager", "Admin", "IG auditor"].includes(newRole)) {
        return NextResponse.json({ error: "Select a valid Ward 3D role." }, { status: 400 });
      }
      updated = await prisma.user.update({
        where: { id },
        data: { role: newRole },
        select: { id: true, name: true, email: true, role: true, accountStatus: true, lastSignInAt: true },
      });
    } else {
      return NextResponse.json({ error: "Select a valid user action." }, { status: 400 });
    }

    await writeWardAudit({
      user: actor,
      request,
      action: action === "role" ? "Role changed" : `User ${action}d`,
      details: { affectedUserId: id, role: updated.role, accountStatus: updated.accountStatus },
    });
    return NextResponse.json({ user: { ...updated, role: normalizeWardRole(updated.role) } });
  } catch (error) {
    console.error("Unable to update Ward 3D user:", error);
    return NextResponse.json({ error: "Unable to update this user." }, { status: 500 });
  }
}
