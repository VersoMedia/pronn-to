import type { NextApiRequest, NextApiResponse } from "next";

import GoogleService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.query?.username) {
    res.status(401).json({ message: "Not username to get user" });
    return;
  }
  const username = req.query?.username as string;
  const slug = req.query?.eventSlug as string;

  const userWithCredentials = await prisma.user.findFirst({
    where: {
      username,
    },
    select: {
      credentials: true,
      timeZone: true,
      id: true,
      selectedCalendars: true,
    },
  });

  const eventTypeUsername = await prisma.eventType.findFirst({
    where: {
      slug,
      userId: userWithCredentials?.id,
    },
    select: {
      id: true,
    },
  });

  const credentialDestination = await prisma.destinationCalendar.findMany({
    where: {
      OR: [{ eventTypeId: eventTypeUsername?.id }, { userId: userWithCredentials?.id }],
    },
    select: {
      id: true,
      eventType: true,
      credentialId: true,
    },
  });

  if (!userWithCredentials) {
    res.status(404).json({ message: "Not user found" });
    return;
  }

  if (req.method === "GET") {
    if (credentialDestination.length) {
      console.log(credentialDestination, "credential destination");
      const credentialId =
        credentialDestination.filter((crd) => crd.eventType)[0] ?? credentialDestination[0];

      const credential = await prisma.credential.findUnique({
        where: {
          id: credentialId?.credentialId,
        },
      });

      if (credential) {
        try {
          const calendarService = new GoogleService(credential);
          const availability = await calendarService.getEvents(new Date(req.query?.date));
          res.status(200).json({ data: availability });
          return;
        } catch (e) {
          console.log(e);
          return res.status(500);
        }
      }

      res.status(200).json({ data: availability });
      return;
    } else {
      res.status(200).json({ data: [] });
      return;
    }
  }

  return res.status(401);
}
