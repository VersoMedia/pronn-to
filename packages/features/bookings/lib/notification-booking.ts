import { get, post } from "@calcom/lib/fetch-wrapper";

import type { BookingNotification } from "../types";

const API_NOTIFICATION = "https://nj81jol814.execute-api.us-west-2.amazonaws.com/dev/v1/notifications";

const confirmationNotificationsArray: string[] = [
  "GENERAL_BOOKING_CUSTOMER",
  "SERVICE_BOOKING_STRIPE_CUSTOMER",
  "SERVICE_BOOKING_CASH_CUSTOMER",
  "SERVICE_BOOKING_TRANSFER_CUSTOMER",
];

export const sendNotification = async (data: BookingNotification) => {
  if (data.type_) {
    const isFor: string = data.type_.split("_")[data.type_.split("_").length - 1];
    try {
      const notification: any = await get(`/api/user/notification?email=${data.member_email}`);

      if (
        (isFor === "CUSTOMER" &&
          notification?.customerWhats &&
          !confirmationNotificationsArray.includes(data.type_)) ||
        (isFor === "MEMBER" && notification?.memberWhats) ||
        (isFor === "CUSTOMER" &&
          notification?.customerWhats &&
          confirmationNotificationsArray.includes(data.type_) &&
          notification?.confirmQuote)
      )
        await post(`${API_NOTIFICATION}?channel=WHATSAPP`, {
          ...data,
          confirmationTextCustom: notification?.textConfirmationQuote ?? "Null",
        });
    } catch (e) {
      console.log(e);
    }
  }
};
