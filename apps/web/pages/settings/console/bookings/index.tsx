import BookingListingView from "@calcom/features/ee/users/pages/bookins-listing-view";

import type { CalPageWrapper } from "@components/PageWrapper";
import PageWrapper from "@components/PageWrapper";

const Page = BookingListingView as CalPageWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
