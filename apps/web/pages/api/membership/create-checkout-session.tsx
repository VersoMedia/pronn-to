import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method === "POST") {
    const { price, quantity = 1, metadata = {} } = req.body;

    try {
      let { stripe_customer_id } = await prisma.user.findFirst({
        where: {
          email: session.user?.email,
        },
      });

      if (!stripe_customer_id) {
        const customer = await stripe.customers.create({
          email: session.user?.email,
        });
        stripe_customer_id = customer.id;
        await prisma.user.update({
          where: {
            email: session.user?.email,
          },
          data: {
            stripe_customer_id,
          },
        });
      }

      const sessionStripe = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        billing_address_collection: "required",
        customer: stripe_customer_id,
        line_items: [
          {
            price: price,
            quantity,
          },
        ],
        mode: "subscription",
        allow_promotion_codes: true,
        subscription_data: {
          trial_from_plan: true,
          metadata,
        },
        success_url: `${"NEXT_PUBLIC_BASE_URL_VERSO"}/profile`,
        cancel_url: `${"NEXT_PUBLIC_BASE_URL_VERSO"}/profile`,
      });

      return res.status(200).json({ sessionId: sessionStripe.id });
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
