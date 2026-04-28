import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  venmoHandle: z
    .string()
    .regex(/^@?[\w.\-]+$/, "Invalid Venmo handle")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && !v.startsWith("@") ? `@${v}` : v)),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;
