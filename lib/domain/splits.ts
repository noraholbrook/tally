/**
 * Pure split calculation engine.
 * No framework dependencies — safe to reuse in React Native or any other runtime.
 */

import { ShareType } from "@/lib/constants";

export interface SplitInput {
  totalCents: number; // total amount to split (may include tax/tip)
  participants: Array<{
    contactId: string;
    shareType: ShareType;
    shareValue: number; // cents (FIXED), percentage * 100 (PERCENTAGE), or ignored (EQUAL)
  }>;
  /**
   * For EQUAL splits: the true headcount including "Me".
   * Defaults to participants.length if omitted (legacy behaviour).
   */
  totalPeople?: number;
}

export interface SplitResult {
  contactId: string;
  amountCents: number;
}

export interface SplitPreview {
  results: SplitResult[];
  totalAllocated: number;
  remainder: number; // rounding remainder
  isBalanced: boolean;
}

/**
 * Calculate split allocations from a total amount.
 * Handles rounding by distributing remainder cents to first participants.
 */
export function calculateSplit(input: SplitInput): SplitPreview {
  const { totalCents, participants, totalPeople } = input;

  if (participants.length === 0) {
    return { results: [], totalAllocated: 0, remainder: totalCents, isBalanced: false };
  }

  const splitType = participants[0].shareType;

  let results: SplitResult[];

  switch (splitType) {
    case ShareType.EQUAL:
      results = calculateEqual(totalCents, participants.map((p) => p.contactId), totalPeople);
      break;

    case ShareType.PERCENTAGE:
      results = calculatePercentage(totalCents, participants);
      break;

    case ShareType.FIXED:
      results = calculateFixed(participants);
      break;

    case ShareType.ITEM_BASED:
      // Item-based uses pre-computed shareValues (cents)
      results = participants.map((p) => ({ contactId: p.contactId, amountCents: p.shareValue }));
      break;

    default:
      throw new Error(`Unknown split type: ${splitType}`);
  }

  const totalAllocated = results.reduce((sum, r) => sum + r.amountCents, 0);
  const remainder = totalCents - totalAllocated;

  return {
    results,
    totalAllocated,
    remainder,
    isBalanced: remainder === 0,
  };
}

function calculateEqual(totalCents: number, contactIds: string[], totalPeople?: number): SplitResult[] {
  const n = totalPeople ?? contactIds.length;
  const base = Math.floor(totalCents / n);
  const extra = totalCents - base * n; // remainder cents (0 to n-1)

  return contactIds.map((contactId, i) => ({
    contactId,
    amountCents: base + (i < extra ? 1 : 0),
  }));
}

function calculatePercentage(
  totalCents: number,
  participants: SplitInput["participants"]
): SplitResult[] {
  // shareValue is percentage * 100 (e.g. 3333 = 33.33%)
  const totalPercent = participants.reduce((s, p) => s + p.shareValue, 0);

  if (totalPercent !== 10000) {
    // Normalize if percentages don't add to 100%
    const scale = 10000 / totalPercent;
    participants = participants.map((p) => ({ ...p, shareValue: Math.round(p.shareValue * scale) }));
  }

  const results = participants.map((p) => ({
    contactId: p.contactId,
    amountCents: Math.floor((totalCents * p.shareValue) / 10000),
  }));

  // Distribute rounding remainder
  const allocated = results.reduce((s, r) => s + r.amountCents, 0);
  const remainder = totalCents - allocated;
  for (let i = 0; i < remainder; i++) {
    results[i % results.length].amountCents += 1;
  }

  return results;
}

function calculateFixed(participants: SplitInput["participants"]): SplitResult[] {
  return participants.map((p) => ({ contactId: p.contactId, amountCents: p.shareValue }));
}

/**
 * Build equal split participants from a list of contact IDs.
 * Each participant gets an equal share of totalCents.
 */
export function buildEqualParticipants(
  contactIds: string[],
  totalCents: number
): SplitInput["participants"] {
  const shareValue = Math.floor(totalCents / contactIds.length);
  return contactIds.map((contactId) => ({
    contactId,
    shareType: ShareType.EQUAL,
    shareValue,
  }));
}

/**
 * Format cents as a dollar string: 5025 → "$50.25"
 */
export function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = (abs / 100).toFixed(2);
  return cents < 0 ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Parse a dollar string to cents: "$50.25" → 5025
 */
export function parseDollarsToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "");
  return Math.round(parseFloat(cleaned || "0") * 100);
}
