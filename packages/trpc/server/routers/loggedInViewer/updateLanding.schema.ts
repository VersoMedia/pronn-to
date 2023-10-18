import { z } from "zod";

import { landingTypeFields } from "@calcom/prisma/zod-utils";

export const ZUpdateLandingInputSchema = z.object({
  landingFields: landingTypeFields.optional(),
});

export type TUpdateLandingInputSchema = z.infer<typeof ZUpdateLandingInputSchema>;
