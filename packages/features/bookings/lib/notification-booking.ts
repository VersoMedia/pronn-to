import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingNotification } from "../types";

const API_NOTIFICATION = "https://wln1iu02ph.execute-api.us-west-2.amazonaws.com/production";

export const sendNotification = async (data: BookingNotification) => {
  await post(`${API_NOTIFICATION}?channel=whatsapp`, {
    requestContext: {
      connectionId: "ZigQieifPHcCGRw=",
    },
    body: {
      action: "sendNotification",
      channel: "WHATSAPP",
      payload: {
        ...data,
      },
    },
  });
};
