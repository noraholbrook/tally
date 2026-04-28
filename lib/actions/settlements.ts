"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { createRequestDraft, markDraftSent, markDraftSettled } from "@/lib/domain/settlements";
import { applySettlement } from "@/lib/domain/balances";

export async function createDraft(contactId: string, amount: number, purchaseId?: string, message?: string) {
  const userId = await getCurrentUserId();
  const draftId = await createRequestDraft({ userId, contactId, amount, purchaseId, message });
  revalidatePath("/requests");
  return { draftId };
}

export async function sendDraft(draftId: string) {
  await markDraftSent(draftId);
  revalidatePath("/requests");
  return { success: true };
}

export async function settleDraft(draftId: string) {
  await markDraftSettled(draftId);
  revalidatePath("/requests");
  revalidatePath("/balances");
  return { success: true };
}

export async function settleBalance(contactId: string, amountCents: number, notes?: string) {
  await applySettlement(contactId, amountCents, notes);
  revalidatePath("/balances");
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function getRequestDrafts() {
  const userId = await getCurrentUserId();
  return prisma.requestDraft.findMany({
    where: { userId },
    include: { contact: true, purchase: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateDraftMessage(draftId: string, message: string) {
  await prisma.requestDraft.update({ where: { id: draftId }, data: { message } });
  revalidatePath("/requests");
  return { success: true };
}
