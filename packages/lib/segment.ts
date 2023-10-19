import { AnalyticsBrowser } from "@segment/analytics-next";

import { ANALYTICS_WRITE_KEY } from "@calcom/lib/constants";

export const analytics = AnalyticsBrowser.load({ writeKey: ANALYTICS_WRITE_KEY });
export const events_analytics = {
  ONBOARDING_FINISHED: "Started account creation",
  SINGUP: "Account creation",
  SINGIN: (id: string) => `${id}`,
  CREATE_EVENT_TYPES: "Event types create",
  CREATE_APPOINTMENT: "Appoinment created",
  BOOK_APPOINTMENT: "Booked appointment",
};
