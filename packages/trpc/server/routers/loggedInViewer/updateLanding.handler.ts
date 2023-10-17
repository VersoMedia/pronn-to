import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TUpdateLandingInputSchema } from "./updateLanding.schema";

type UpdateLandingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateLandingInputSchema;
};

export const updateLandingHandler = async ({ ctx, input }: UpdateLandingOptions) => {
  // Check if input.password is correct
  const user = await prisma.user.findUnique({
    where: {
      email: ctx.user.email.toLowerCase(),
    },
  });
  if (!user) {
    throw new Error(ErrorCode.UserNotFound);
  }

  const update = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: { landingFields: input.landingFields },
  });

  return { data: update };
};
