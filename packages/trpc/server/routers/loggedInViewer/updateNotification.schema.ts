import { z } from "zod";

export const ZUpdateNotificationInputSchema = z.object({
  phone: z.string().optional(),
  customerWhats: z.boolean().optional(),
  memberWhats: z.boolean().optional(),
  oneDay: z.boolean().optional(),
  textOneDays: z.string().optional(),
  twoDays: z.boolean().optional(),
  textTwoDays: z.string().optional(),
  twelveHours: z.boolean().optional(),
  textTwelveHours: z.string().optional(),
  sixHours: z.boolean().optional(),
  textSixHours: z.string().optional(),
  oneHour: z.boolean().optional(),
  textOneHours: z.string().optional(),
  thirtyMinutes: z.boolean().optional(),
  textThirtyMinutes: z.string().optional(),
  textConfirmationQuote: z.string().optional(),
  confirmQuote: z.boolean().optional(),
});

export type TUpdateNotificationInputSchema = z.infer<typeof ZUpdateNotificationInputSchema>;
