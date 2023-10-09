import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "pg";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const query =
    'SELECT "users".username, "Service".id, "Service".title, "Service".description, ' +
    '"Service".currency, "Service".price, "Service"."paymentCash", "ServiceSettings"."bookingsDuration", ' +
    '"Service"."paymentTransfer", "Service".active ' +
    'FROM "Service" ' +
    'INNER JOIN "users" ON "users".id = "Service"."userId" INNER JOIN "ServiceSettings" ON "Service".id = "ServiceSettings"."serviceId"';

  try {
    const client = new Client({
      user: "postgres",
      host: "db.eaykantsfhajrnmfcqwm.supabase.co",
      database: "verso",
      password: "XjIBvvhjSQXsXijw",
      port: 5432,
    });

    await client.connect();
    const response = await client.query(query);
    await client.end();

    const usersCurrent = await prisma.user.findMany({
      select: { username: true, email: true, id: true },
    });
    const eventTypes = await prisma.eventType.findMany({
      select: { id: true, slug: true },
    });
    // const attendeesCurrent = await prisma.attendee.findMany({
    //   select: { email: true, phone: true },
    // });

    const eventTypeCreateObject: Prisma.EventTypeCreateInput[] = [];

    response.rows.map((service) => {
      if (
        !String(service.username).includes("test") &&
        usersCurrent.find((user) => user.username === service.username) &&
        !eventTypes.find((event) => event.slug === slugify(service.title))
      )
        eventTypeCreateObject.push({
          title: service.title,
          slug: slugify(service.title),
          description: service.description,
          currency: service.currency,
          price: service.price,
          paymentCash: service.price > 0 && service.paymentCash,
          paymentTransfer: service.price > 0 && service.paymentTransfer,
          hidden: service.active,
          length: service.bookingsDuration,
          users: { connect: { id: usersCurrent.find((user) => user.username === service.username).id } },
          owner: { connect: { id: usersCurrent.find((user) => user.username === service.username).id } },
          locations: [],
        });
    });

    eventTypeCreateObject.map(async (event) => await prisma.eventType.create({ data: event }));

    return res.json({ message: "Migration complete", data: eventTypeCreateObject.length });
  } catch (error) {
    console.log(error);
  }
}
