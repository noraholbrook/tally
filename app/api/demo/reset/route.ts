import { NextResponse } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Delete in dependency order so foreign keys don't block
    await prisma.requestDraft.deleteMany({ where: { userId: DEMO_USER_ID } });
    await prisma.auditLog.deleteMany({ where: { userId: DEMO_USER_ID } });
    await prisma.purchase.deleteMany({ where: { userId: DEMO_USER_ID } });
    await prisma.contact.deleteMany({ where: { userId: DEMO_USER_ID } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Clear data failed:", e);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
