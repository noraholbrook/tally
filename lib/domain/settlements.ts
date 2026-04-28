/**
 * Settlement and Venmo draft domain logic.
 */

import { prisma } from "@/lib/db";
import { DraftStatus } from "@/lib/constants";
import { formatCents } from "./splits";

export interface VenmoDraftInput {
  contactId: string;
  purchaseId?: string;
  amount: number; // cents
  message?: string;
}

/**
 * Generate a Venmo request draft message.
 */
export function generateVenmoMessage(params: {
  contactName: string;
  merchant?: string;
  amountCents: number;
  notes?: string;
}): string {
  const { contactName, merchant, amountCents, notes } = params;
  const amount = formatCents(amountCents);
  const parts: string[] = [];

  if (merchant) {
    parts.push(`${amount} for ${merchant}`);
  } else {
    parts.push(`${amount} owed`);
  }

  if (notes) parts.push(`— ${notes}`);
  parts.push("via Tally 🧾");

  return parts.join(" ");
}

/**
 * Create a Venmo request draft.
 */
export async function createRequestDraft(input: VenmoDraftInput & { userId: string }): Promise<string> {
  const contact = await prisma.contact.findUnique({ where: { id: input.contactId } });
  if (!contact) throw new Error("Contact not found");

  let purchase = null;
  if (input.purchaseId) {
    purchase = await prisma.purchase.findUnique({ where: { id: input.purchaseId } });
  }

  const message =
    input.message ??
    generateVenmoMessage({
      contactName: contact.name,
      merchant: purchase?.merchant,
      amountCents: input.amount,
    });

  const draft = await prisma.requestDraft.create({
    data: {
      userId: input.userId,
      contactId: input.contactId,
      purchaseId: input.purchaseId,
      amount: input.amount,
      message,
      status: DraftStatus.DRAFT,
    },
  });

  return draft.id;
}

/**
 * Mark a draft as sent.
 */
export async function markDraftSent(draftId: string): Promise<void> {
  await prisma.requestDraft.update({
    where: { id: draftId },
    data: { status: DraftStatus.SENT, sentAt: new Date() },
  });
}

/**
 * Mark a draft as settled and update the balance.
 */
export async function markDraftSettled(draftId: string): Promise<void> {
  const draft = await prisma.requestDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("Draft not found");

  const balance = await prisma.balance.findUnique({ where: { contactId: draft.contactId } });
  if (!balance) throw new Error("No balance found");

  await prisma.$transaction([
    prisma.requestDraft.update({
      where: { id: draftId },
      data: { status: DraftStatus.SETTLED, settledAt: new Date() },
    }),
    prisma.balance.update({
      where: { contactId: draft.contactId },
      data: {
        totalPaid: { increment: draft.amount },
        outstanding: { decrement: draft.amount },
      },
    }),
    prisma.settlement.create({
      data: {
        balanceId: balance.id,
        contactId: draft.contactId,
        amount: draft.amount,
        notes: `Settled via request #${draftId.slice(-6)}`,
      },
    }),
  ]);
}
