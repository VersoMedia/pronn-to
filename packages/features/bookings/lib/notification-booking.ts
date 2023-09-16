import { post } from "@calcom/lib/fetch-wrapper";

import type { BookingNotification } from "../types";

const API_NOTIFICATION = "https://nj81jol814.execute-api.us-west-2.amazonaws.com/dev/v1/notifications";

export const sendNotification = async (data: BookingNotification) => {
  await post(`${API_NOTIFICATION}?channel=WHATSAPP`, {
    ...data,
  });
};
