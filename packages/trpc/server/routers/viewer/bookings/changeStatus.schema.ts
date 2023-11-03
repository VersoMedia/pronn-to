import { z } from "zod";

import { commonBookingSchema } from "./types";

export const ZChangeStatusInputSchema = commonBookingSchema.extend({
  status: z.string(),
});

export type TChangeStatusInputSchema = z.infer<typeof ZChangeStatusInputSchema>;
