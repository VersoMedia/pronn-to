import type { GetServerSidePropsContext, NextApiResponse } from "next";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { type TUpdateNotificationInputSchema } from "./updateNotification.schema";

type UpdateNotificationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
  input: TUpdateNotificationInputSchema;
};

export const updateNotificationHandler = async ({ ctx, input }: UpdateNotificationOptions) => {
  const { user } = ctx;
  const data = {
    customerWhats: input.customerWhats,
    memberWhats: input.memberWhats,
    oneDay: input.oneDay,
    textOneDays: input.textOneDays,
    twoDays: input.twoDays,
    textTwoDays: input.textTwoDays,
    twelveHours: input.twelveHours,
    textTwelveHours: input.textTwelveHours,
    sixHours: input.sixHours,
    textSixHours: input.textSixHours,
    oneHour: input.oneHour,
    textOneHours: input.textOneHours,
    thirtyMinutes: input.thirtyMinutes,
    textThirtyMinutes: input.textThirtyMinutes,
  };

  const updatedUser = await prisma.notificationSettings.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      ...data,
    },
    update: data,
  });

  if (input.phone) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        phone: input.phone,
      },
    });
  }

  return { ...updatedUser };
};
