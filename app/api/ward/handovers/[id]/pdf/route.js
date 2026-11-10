import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getWardUser, hasWardRole, writeWardAudit } from "@/lib/wardAuth";
import { buildHandoverPdf } from "@/lib/wardPdf";

export async function GET(request, { params }) {
  try {
    const user = await getWardUser(request);
    if (!hasWardRole(user, ["NIC", "Ward staff", "Ward manager"])) {
      return NextResponse.json({ error: "You do not have permission to access handover PDFs." }, { status: user ? 403 : 401 });
    }
    const { id } = await params;
    const record = await prisma.wardHandover.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: "Handover not found." }, { status: 404 });
    if (record.status !== "SIGNED_OFF") {
      return NextResponse.json({ error: "A PDF is available only after both NICs sign off the handover." }, { status: 409 });
    }

    let pdfData = record.pdfData;
    if (!pdfData) {
      pdfData = buildHandoverPdf(record);
      await prisma.wardHandover.update({
        where: { id },
        data: { pdfData, pdfGeneratedAt: new Date() },
      });
    }
    await writeWardAudit({ user, request, action: "Printed", recordId: id });

    return new Response(pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ward-3d-handover-${record.handoverDate.toISOString().slice(0, 10)}-${record.shift.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Unable to generate Ward 3D handover PDF:", error);
    return NextResponse.json({ error: "Unable to generate the handover PDF." }, { status: 500 });
  }
}
