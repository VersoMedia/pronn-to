import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = req.query?.email as string;

  const member = await prisma.notificationSettings.findFirst({
    where: {
      user: {
        email: email,
      },
    },
    select: {
      memberWhats: true,
      customerWhats: true,
    },
  });

  return res.status(200).json(member);
}
