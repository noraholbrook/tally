/**
 * Enum-like string constants for fields that were previously Prisma enums.
 * SQLite doesn't support native enums, so these are stored as plain strings.
 */

export const PurchaseSource = {
  MANUAL: "MANUAL",
  RECEIPT: "RECEIPT",
  SIMULATED: "SIMULATED",
} as const;
export type PurchaseSource = (typeof PurchaseSource)[keyof typeof PurchaseSource];

export const ShareType = {
  EQUAL: "EQUAL",
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED",
  ITEM_BASED: "ITEM_BASED",
} as const;
export type ShareType = (typeof ShareType)[keyof typeof ShareType];

export const DraftStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  SETTLED: "SETTLED",
  CANCELLED: "CANCELLED",
} as const;
export type DraftStatus = (typeof DraftStatus)[keyof typeof DraftStatus];
