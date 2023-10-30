import { get, post } from "@calcom/lib/fetch-wrapper";

import type { BookingNotification } from "../types";

const API_NOTIFICATION = "https://nj81jol814.execute-api.us-west-2.amazonaws.com/dev/v1/notifications";

export const sendNotification = async (data: BookingNotification) => {
  if (data.type_) {
    const isFor: string = data.type_.split("_")[data.type_.split("_").length - 1];
    try {
      const notification: any = await get(`/api/user/notification?email=${data.member_email}`);

      if (
        (isFor === "CUSTOMER" && notification?.customerWhats) ||
        (isFor === "MEMBER" && notification?.memberWhats)
      )
        await post(`${API_NOTIFICATION}?channel=WHATSAPP`, {
          ...data,
        });
    } catch (e) {
      console.log(e);
    }
  }
};
