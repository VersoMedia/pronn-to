import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TChangeStatusInputSchema } from "./changeStatus.schema";

type ChangeStatusOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TChangeStatusInputSchema;
};

export const changeStatusHandler = async ({ ctx, input }: ChangeStatusOptions) => {
  const { bookingId, status } = input;

  try {
    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status,
      },
    });
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
  return { message: "Status updated" };
};
