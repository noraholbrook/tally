import { NextResponse } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: DEMO_USER_ID },
      select: { id: true, balance: { select: { id: true } } },
    });

    const contactIds = contacts.map((c) => c.id);
    const balanceIds = contacts.flatMap((c) => c.balance ? [c.balance.id] : []);

    // Delete in reverse-dependency order
    if (balanceIds.length > 0) {
      await prisma.settlement.deleteMany({ where: { balanceId: { in: balanceIds } } });
      await prisma.balance.deleteMany({ where: { id: { in: balanceIds } } });
    }
    await prisma.requestDraft.deleteMany({ where: { userId: DEMO_USER_ID } });
    await prisma.auditLog.deleteMany({ where: { userId: DEMO_USER_ID } });
    await prisma.purchase.deleteMany({ where: { userId: DEMO_USER_ID } });
    if (contactIds.length > 0) {
      await prisma.contact.deleteMany({ where: { id: { in: contactIds } } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Clear data failed:", e);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
