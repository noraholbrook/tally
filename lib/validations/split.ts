import { z } from "zod";

const shareTypeEnum = z.enum(["EQUAL", "PERCENTAGE", "FIXED", "ITEM_BASED"]);

export const splitParticipantSchema = z.object({
  contactId: z.string().cuid(),
  shareType: shareTypeEnum,
  shareValue: z.number().int().positive(), // cents or percentage * 100
});

export const splitSetupSchema = z.object({
  purchaseId: z.string().cuid(),
  participants: z
    .array(splitParticipantSchema)
    .min(1, "Select at least one person"),
  splitType: shareTypeEnum,
  includeTax: z.boolean().default(true),
  includeTip: z.boolean().default(true),
});

export type SplitSetupInput = z.input<typeof splitSetupSchema>;
export type SplitSetupData = z.output<typeof splitSetupSchema>;
