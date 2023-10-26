import NoSSR from "@calcom/core/components/NoSSR";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import { BookingList } from "../components/BookingsTable";

const DeploymentUsersListPage = () => {
  return (
    <>
      <Meta
        title="Bookins"
        description="A list of all the bookings in your account."
        CTA={<div className="mt-4 space-x-5 sm:ml-16 sm:mt-0 sm:flex-none" />}
      />
      <NoSSR>
        <BookingList />
      </NoSSR>
    </>
  );
};

DeploymentUsersListPage.getLayout = getLayout;

export default DeploymentUsersListPage;
