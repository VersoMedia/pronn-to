import { z } from "zod";

export const ZUpdateTransferCredentialInputSchema = z.object({
  name: z.string().optional(),
  bank: z.string().optional(),
  clabe: z.string().optional(),
});

export type TUpdateTransferCredentialInputSchema = z.infer<typeof ZUpdateTransferCredentialInputSchema>;
