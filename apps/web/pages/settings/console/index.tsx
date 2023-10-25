import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/ConsoleLayout";

function ConsoleAppsView() {
  return (
    <>
      <Meta title="console" description="admin_description" />
      <h1>Console index</h1>
    </>
  );
}

ConsoleAppsView.getLayout = getLayout;
ConsoleAppsView.PageWrapper = PageWrapper;

export default ConsoleAppsView;
