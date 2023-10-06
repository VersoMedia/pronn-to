import { Promise } from "bluebird";
import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "pg";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const query =
    'SELECT "users".username, "users".email, "users".password, "Profile"."displayName", "Profile".about, "Profile".avatar, "Profile".phone, "Customer".name AS customer_name, "Customer".email AS customer_email, "Customer".phone AS customer_phone FROM "users" INNER JOIN "Profile" ON "Profile"."userId" = "users".id INNER JOIN "Customer" ON "Customer"."memberId" = "users".id';

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
      select: { username: true, email: true },
    });
    const attendeesCurrent = await prisma.attendee.findMany({
      select: { email: true, phone: true },
    });

    const userCreateObject: Prisma.UserCreateInput[] = [];

    response.rows.map((user) => {
      if (
        usersCurrent.findIndex((userC) => userC.username === user.username || userC.email === user.email) !==
        -1
      ) {
        return;
      }

      if (!userCreateObject.find((uc) => uc.username === user.username)) {
        userCreateObject.push({
          username: user.username,
          name: user.displayName,
          email: user.email,
          phone: String(user.phone).includes("+") ? user.phone : `+${user.phone}`,
          password: user.password,
          bio: user.about,
          avatar: user.avatar,
          timeZone: "America/Mexico_City",
          weekStart: "Sunday",
          completedOnboarding: false,
          twoFactorEnabled: false,
          locale: "es",
          identityProvider: "CAL",
          role: "USER",
        });
      }

      if (userCreateObject.find((uc) => uc.username === user.username)) {
        if (
          !attendeesCurrent.find(
            (atte) =>
              (!user.customer_email && !user.customer_phone) ||
              atte.email === user.customer_email ||
              atte.phone ===
                (String(user.customer_phone).includes("+") ? user.customer_phone : `+${user.customer_phone}`)
          )
        ) {
          const phone = String(user.customer_phone).includes("+")
            ? user.customer_phone
            : `+${user.customer_phone}`;
          const objectCustomer = {
            name: user.customer_name,
            timeZone: "America/Mexico_City",
            phone: phone,
            locale: "es",
            email: user.customer_email,
          };

          if (
            !userCreateObject[userCreateObject.findIndex((uc) => uc.username === user.username)]?.attendees
              ?.createMany?.data ||
            !userCreateObject[
              userCreateObject.findIndex((uc) => uc.username === user.username)
            ]?.attendees?.createMany?.data.find(
              (atte) =>
                atte.email === user.customer_email ||
                atte.phone ===
                  (String(user.customer_phone).includes("+")
                    ? user.customer_phone
                    : `+${user.customer_phone}`)
            )
          )
            userCreateObject[userCreateObject.findIndex((uc) => uc.username === user.username)] = {
              ...userCreateObject[userCreateObject.findIndex((uc) => uc.username === user.username)],
              attendees: {
                createMany: {
                  data: userCreateObject[userCreateObject.findIndex((uc) => uc.username === user.username)]
                    ?.attendees?.createMany?.data
                    ? [
                        ...userCreateObject[userCreateObject.findIndex((uc) => uc.username === user.username)]
                          .attendees?.createMany?.data,
                        objectCustomer,
                      ]
                    : [objectCustomer],
                },
              },
            };
        }
      }
    });

    await Promise.map(userCreateObject, async (user) => {
      await prisma.user.create({
        data: user,
      });
    });

    return res.json({ message: "Migration complete", data: userCreateObject.length });
  } catch (error) {
    console.log(error);
  }
}
