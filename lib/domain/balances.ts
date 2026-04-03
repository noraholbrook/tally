/**
 * Balance management domain logic.
 * Operates on balance records and applies splits/settlements.
 */

import { prisma } from "@/lib/db";

/**
 * Apply a split result to a contact's balance ledger.
 * Creates balance record if it doesn't exist.
 */
export async function applySpliToBalance(contactId: string, amountCents: number): Promise<void> {
  await prisma.balance.upsert({
    where: { contactId },
    create: {
      contactId,
      totalOwed: amountCents,
      totalPaid: 0,
      outstanding: amountCents,
    },
    update: {
      totalOwed: { increment: amountCents },
      outstanding: { increment: amountCents },
    },
  });
}

/**
 * Apply a settlement (full or partial) to a contact's balance.
 */
export async function applySettlement(contactId: string, amountCents: number, notes?: string): Promise<void> {
  const balance = await prisma.balance.findUnique({ where: { contactId } });
  if (!balance) throw new Error(`No balance found for contact ${contactId}`);

  const newPaid = balance.totalPaid + amountCents;
  const newOutstanding = Math.max(0, balance.outstanding - amountCents);

  await prisma.$transaction([
    prisma.balance.update({
      where: { contactId },
      data: { totalPaid: newPaid, outstanding: newOutstanding },
    }),
    prisma.settlement.create({
      data: {
        balanceId: balance.id,
        contactId,
        amount: amountCents,
        notes,
      },
    }),
  ]);
}

/**
 * Get all outstanding balances for the current user, sorted descending.
 */
export async function getOutstandingBalances(userId: string) {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: { balance: true },
  });

  return contacts
    .filter((c) => c.balance && c.balance.outstanding > 0)
    .sort((a, b) => (b.balance?.outstanding ?? 0) - (a.balance?.outstanding ?? 0));
}

/**
 * Recompute a balance from scratch based on all splits and settlements.
 * Use for reconciliation / auditing.
 */
export async function recomputeBalance(contactId: string): Promise<void> {
  const splits = await prisma.splitParticipant.findMany({
    where: { contactId },
    select: { shareValue: true, shareType: true },
  });

  const settlements = await prisma.settlement.findMany({
    where: { contactId },
    select: { amount: true },
  });

  const totalOwed = splits.reduce((sum, s) => sum + s.shareValue, 0);
  const totalPaid = settlements.reduce((sum, s) => sum + s.amount, 0);
  const outstanding = Math.max(0, totalOwed - totalPaid);

  await prisma.balance.upsert({
    where: { contactId },
    create: { contactId, totalOwed, totalPaid, outstanding },
    update: { totalOwed, totalPaid, outstanding },
  });
}
