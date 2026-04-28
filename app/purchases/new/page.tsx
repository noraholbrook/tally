export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { AddPurchaseClient } from "./_components/AddPurchaseClient";

export default async function NewPurchasePage() {
  const userId = await getCurrentUserId();
  const [categories, contacts, recentSplits] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.contact.findMany({ where: { userId }, include: { balance: true }, orderBy: { name: "asc" } }),
    prisma.splitParticipant.findMany({
      where: { purchase: { userId } },
      orderBy: { purchase: { date: "desc" } },
      include: { contact: true },
      take: 20,
    }),
  ]);

  const seen = new Set<string>();
  const recentContactIds: string[] = [];
  for (const sp of recentSplits) {
    if (!seen.has(sp.contactId)) {
      seen.add(sp.contactId);
      recentContactIds.push(sp.contactId);
    }
    if (recentContactIds.length >= 4) break;
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>}>
      <AddPurchaseClient categories={categories} contacts={contacts} recentContactIds={recentContactIds} />
    </Suspense>
  );
}
