import { type PrismaClient } from "@prisma/client";

import { hasFilter } from "@calcom/features/filters/lib/hasFilter";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { getTranslation } from "@calcom/lib/server/i18n";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TEventTypeInputSchema } from "./getByViewer.schema";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventTypeInputSchema;
};

export const compareMembership = (mship1: MembershipRole, mship2: MembershipRole) => {
  const mshipToNumber = (mship: MembershipRole) =>
    Object.keys(MembershipRole).findIndex((mmship) => mmship === mship);
  return mshipToNumber(mship1) > mshipToNumber(mship2);
};

export const getByViewerHandler = async ({ ctx }: GetByViewerOptions) => {
  const { prisma } = ctx;

  await checkRateLimitAndThrowError({
    identifier: `attendees:getByViewer:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      id: true,
      bookings: {
        select: {
          attendees: true,
        },
      },
    },
  });

  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const attendeesListPromises = [];

  for (const booking of user.bookings) {
    for (const attendee of booking.attendees) {
      const attendeeObject = {
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: {
          translate: await getTranslation(attendee.locale ?? "en", "common"),
          locale: attendee.locale ?? "en",
        },
      };

      attendeesListPromises.push(attendeeObject);
    }
  }

  const attendeesList = await Promise.all(attendeesListPromises);

  return {
    // don't display event teams without event types,
    attendees: attendeesList,
  };
};

export function getPrismaWhereUserIdFromFilter(
  userId: number,
  filters: NonNullable<TEventTypeInputSchema>["filters"] | undefined
) {
  if (!filters || !hasFilter(filters)) {
    return userId;
  } else if (filters.userIds?.[0] === userId) {
    return userId;
  }
  return 0;
}
