import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    const contacts = await prisma.contact.findMany({
      where: { userId },
      select: { id: true, balance: { select: { id: true } } },
    });

    const contactIds = contacts.map((c) => c.id);
    const balanceIds = contacts.flatMap((c) => c.balance ? [c.balance.id] : []);

    if (balanceIds.length > 0) {
      await prisma.settlement.deleteMany({ where: { balanceId: { in: balanceIds } } });
      await prisma.balance.deleteMany({ where: { id: { in: balanceIds } } });
    }
    await prisma.requestDraft.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.purchase.deleteMany({ where: { userId } });
    if (contactIds.length > 0) {
      await prisma.contact.deleteMany({ where: { id: { in: contactIds } } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Clear data failed:", e);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
