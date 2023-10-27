import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../trpc";
import type { TListMembersSchema } from "./listPaginated.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersSchema;
};

export const bookingsPaginatedHandler = async ({ ctx, input }: GetOptions) => {
  const { cursor, limit, searchTerm } = input;

  const getTotalBookings = await prisma.booking.count();

  let searchFilters: Prisma.BookingWhereInput = {};

  if (searchTerm) {
    searchFilters = {
      OR: [
        {
          user: {
            email: {
              contains: searchTerm.toLowerCase(),
            },
          },
        },
        {
          title: {
            contains: searchTerm.toLocaleLowerCase(),
          },
        },
      ],
    };
  }

  const bookings = await prisma.booking.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
    where: searchFilters,
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          phone: true,
        },
      },
      title: true,
      createdAt: true,
      startTime: true,
      endTime: true,
      attendeesMany: {
        select: {
          attendee: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (bookings && bookings.length > limit) {
    const nextItem = bookings.pop();
    nextCursor = nextItem!.id;
  }

  return {
    rows: bookings || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalBookings || 0,
    },
  };
};
