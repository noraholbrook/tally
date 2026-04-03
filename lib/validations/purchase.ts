import { z } from "zod";

export const purchaseSchema = z.object({
  merchant: z.string().min(1, "Merchant name is required").max(100),
  amount: z
    .string()
    .regex(/^\d+(\.\d{0,2})?$/, "Enter a valid amount")
    .transform((v) => Math.round(parseFloat(v) * 100)), // convert to cents
  tax: z
    .string()
    .optional()
    .default("0")
    .transform((v) => Math.round(parseFloat(v || "0") * 100)),
  tip: z
    .string()
    .optional()
    .default("0")
    .transform((v) => Math.round(parseFloat(v || "0") * 100)),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
  date: z.string().transform((v) => new Date(v)),
  source: z.enum(["MANUAL", "RECEIPT", "SIMULATED"]).default("MANUAL"),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        amount: z
          .string()
          .transform((v) => Math.round(parseFloat(v) * 100)),
        quantity: z.number().int().positive().default(1),
      })
    )
    .optional(),
});

export type PurchaseInput = z.input<typeof purchaseSchema>;
export type PurchaseData = z.output<typeof purchaseSchema>;
