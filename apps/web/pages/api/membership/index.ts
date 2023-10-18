import type { NextApiRequest, NextApiResponse } from "next";

import { retrieveSubscriptionIdFromStripeCustomerId } from "@calcom/app-store/stripepayment/lib/subscriptions";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method === "POST") {
    try {
      const user = await prisma.user.findFirst({
        where: {
          email: session.user.email,
        },
        select: {
          stripe_customer_id: true,
        },
      });
      const subscription = await retrieveSubscriptionIdFromStripeCustomerId(user?.stripe_customer_id);

      return res.status(200).json({ subscription });
    } catch (err: any) {
      console.log(err);
      res.status(500).json({
        error: { statusCode: 500, message: err.message },
      });
    }
  } else {
    throw new Error(`The HTTP ${req.method} method is not supported by this route.`);
  }
}
