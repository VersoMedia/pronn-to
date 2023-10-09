import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "pg";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import dayjs from "@calcom/dayjs";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

const translator = short();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const query =
    'SELECT "Booking"."startTime", "Booking"."endTime", "Booking".status, ' +
    '"users".username, "Customer".name, "Customer".email, "Customer".phone, "Schedule".timezone, "Profile"."displayName", "Service".title ' +
    'FROM "Booking" ' +
    'INNER JOIN "Service" ON "Booking"."serviceId" = "Service".id ' +
    'INNER JOIN "users" ON "users".id = "Booking"."userId" ' +
    'INNER JOIN "Profile" ON "users".id = "Profile"."userId" ' +
    'INNER JOIN "Customer" ON "Booking"."attendeeId" = "Customer".id ' +
    'INNER JOIN "Schedule" ON "Booking"."scheduleId" = "Schedule".id ' +
    'WHERE "Booking"."startTime" >= Now()';

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
    const attendeesCurrent = await prisma.attendee.findMany({
      select: { email: true, phone: true, id: true },
    });
    const bookingsCurrent = await prisma.booking.findMany({
      select: {
        id: true,
        startTime: true,
        endTime: true,
        eventType: { select: { title: true } },
        user: { select: { username: true } },
      },
    });

    const bookingCreateObject: Prisma.BookingCreateInput[] = [];

    response.rows.map((booking) => {
      const seed = `${booking.username}:${dayjs(booking.startTime).utc().format()}:${new Date().getTime()}`;
      const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

      if (
        !bookingsCurrent.find(
          (bb) =>
            dayjs(bb.startTime).utc().format() === dayjs(booking.startTime).utc().format() &&
            dayjs(bb.endTime).utc().format() === dayjs(booking.endTime).utc().format() &&
            usersCurrent.find((user) => user.username === bb?.user?.username)?.id &&
            eventTypes.find((event) => event.slug === slugify(bb?.eventType?.title || ""))?.id
        ) &&
        usersCurrent.find((user) => user.username === booking.username)?.id
      )
        bookingCreateObject.push({
          title: `Cita entre ${booking.displayName} y ${booking.name}`,
          uid,
          startTime: dayjs(booking.startTime)
            .tz(booking.timezone ?? "America/Mexico_City")
            .format(),
          endTime: dayjs(booking.endTime)
            .tz(booking.timezone ?? "America/Mexico_City")
            .format(),
          status: booking.status === "COMPLETED" ? "ACCEPTED" : booking.status,
          user: {
            connect: {
              id: usersCurrent.find((user) => user.username === booking.username)?.id,
            },
          },
          attendees: {
            create: {
              name: booking.name || "",
              phone: booking.phone || "",
              email: booking.email || "",
              timeZone: "America/Mexico_City",
            },
          },
          eventType: {
            connect: {
              id: eventTypes.find((event) => event.slug === slugify(booking.title))?.id,
            },
          },
          responses: {
            name: booking.name,
            email: booking.email,
            phone: booking.phone,
          },
        });
    });

    //console.log(bookingCreateObject)
    bookingCreateObject.map(async (booking) => await prisma.booking.create({ data: booking }));

    return res.json({ message: "Migration complete", data: bookingCreateObject.length });
  } catch (error) {
    console.log(error);
  }
}
