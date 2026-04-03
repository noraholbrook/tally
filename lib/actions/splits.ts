"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { calculateSplit } from "@/lib/domain/splits";
import { applySpliToBalance } from "@/lib/domain/balances";
import type { ShareType } from "@/lib/constants";

interface CreateSplitInput {
  purchaseId: string;
  contactIds: string[];
  splitType: ShareType;
  includeTax: boolean;
  includeTip: boolean;
  customShares?: Record<string, number>; // contactId -> shareValue (cents or pct*100)
}

export async function createSplit(input: CreateSplitInput) {
  const { purchaseId, contactIds, splitType, includeTax, includeTip, customShares } = input;

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return { error: "Purchase not found" };

  let totalCents = purchase.amount;
  if (includeTax) totalCents += purchase.tax;
  if (includeTip) totalCents += purchase.tip;

  // Build participants
  const participants = contactIds.map((contactId) => {
    const shareValue = customShares?.[contactId] ?? Math.floor(totalCents / contactIds.length);
    return { contactId, shareType: splitType, shareValue };
  });

  // Calculate split
  const splitResult = calculateSplit({ totalCents, participants });

  // Persist in a transaction
  await prisma.$transaction(async (tx) => {
    // Remove any existing split for this purchase
    await tx.splitParticipant.deleteMany({ where: { purchaseId } });

    // Create split participants with calculated amounts
    for (const result of splitResult.results) {
      await tx.splitParticipant.create({
        data: {
          purchaseId,
          contactId: result.contactId,
          shareType: splitType,
          shareValue: result.amountCents,
        },
      });
    }

    // Mark purchase as split
    await tx.purchase.update({ where: { id: purchaseId }, data: { isSplit: true } });
  });

  // Update balances outside transaction (upserts)
  for (const result of splitResult.results) {
    await applySpliToBalance(result.contactId, result.amountCents);
  }

  revalidatePath("/");
  revalidatePath(`/purchases/${purchaseId}`);
  revalidatePath("/balances");

  return { success: true, splits: splitResult.results };
}

export async function getSplitPreview(input: CreateSplitInput) {
  const { purchaseId, contactIds, splitType, includeTax, includeTip, customShares } = input;

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return null;

  let totalCents = purchase.amount;
  if (includeTax) totalCents += purchase.tax;
  if (includeTip) totalCents += purchase.tip;

  const participants = contactIds.map((contactId) => {
    const shareValue = customShares?.[contactId] ?? Math.floor(totalCents / contactIds.length);
    return { contactId, shareType: splitType, shareValue };
  });

  return calculateSplit({ totalCents, participants });
}
