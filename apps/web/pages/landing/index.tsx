import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getLayout } from "@calcom/features/MainLayout";
import { LandingBuilder } from "@calcom/features/landing-builder/LandingBuilder";
import { ShellMain } from "@calcom/features/shell/Shell";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { landingTypeFields } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Form, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import SkeletonLoader from "@components/eventtype/SkeletonLoader";

export type FormValues = {
  landingFields: z.infer<typeof landingTypeFields>;
};

export type landingSetupProps = RouterOutputs["viewer"]["me"];

function LandingPage(props: landingSetupProps) {
  const { t } = useLocale();
  const { ...user } = props;
  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();

  const updateMutation = trpc.viewer.updateLandings.useMutation({
    onSuccess: async () => {
      showToast(t("updated_successfully"), "success");
    },
    onError: (err) => {
      let message = "";
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "PARSE_ERROR" || err.data?.code === "BAD_REQUEST") {
        message = `${err.data.code}: ${t(err.message)}`;
      }

      if (err.data?.code === "INTERNAL_SERVER_ERROR") {
        message = t("unexpected_error_try_again");
      }

      showToast(message ? t(message) : t(err.message), "error");
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultValues: any = useMemo(() => {
    return {
      landingFields: user.landingFields,
    };
  }, [user]);

  const formMethods = useForm<FormValues>({
    defaultValues,
    resolver: zodResolver(
      z
        .object({
          landingFields: landingTypeFields,
        })
        // TODO: Add schema for other fields later.
        .passthrough()
    ),
  });

  useEffect(() => {
    if (eventTypes && user && !user?.landingFields) {
      const events = eventTypes.map((event) => ({
        content: `${CAL_URL}/${user?.username}/${event.slug}`,
        hidden: event.hidden,
        editable: "user",
        label: event.title,
        type: "service",
        name: event.slug,
      }));
      formMethods.setValue("landingFields", events);
    } else {
      const news =
        eventTypes?.filter(
          (event) =>
            !formMethods
              .getValues("landingFields")
              ?.map((l) => l.name)
              .includes(event.slug)
        ) ?? [];
      if (news.length > 0) {
        const events = news.map((event) => ({
          content: `${CAL_URL}/${user?.username}/${event.slug}`,
          hidden: event.hidden,
          editable: "user",
          label: event.title,
          type: "service",
          name: event.slug,
        }));
        formMethods.setValue("landingFields", [...formMethods.getValues("landingFields"), ...events]);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  if (!eventTypes) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <ShellMain
        withoutSeo
        heading={t("landing_page_title")}
        hideHeadingOnMobile
        subtitle={t("landing_page_subtitle")}
        CTA={
          <div className="flex items-center justify-end">
            <Button
              className="ml-4 lg:ml-0"
              type="button"
              href={`${CAL_URL}/${user?.username}`}
              target="_blank">
              {t("view_public_page")}
            </Button>
            <div className="border-default border-l-2" />
            <Button
              className="ml-4 lg:ml-0"
              loading={updateMutation.isLoading}
              type="submit"
              data-testid="update-landing"
              form="landing-form">
              {t("save")}
            </Button>
          </div>
        }>
        <Form
          form={formMethods}
          id="landing-form"
          handleSubmit={(values) => {
            updateMutation.mutate({ landingFields: values.landingFields });
          }}>
          <LandingBuilder
            title={t("landing_title")}
            description={t("landing_description")}
            addFieldLabel={t("add_button_landing")}
            formProp="landingFields"
            // {...shouldLockDisableProps("landingFields")}
            disabled={false}
            LockedIcon={false}
            dataStore={{
              options: {
                locations: [],
              },
            }}
          />
        </Form>
      </ShellMain>
    </div>
  );
}

const LandingPageWrapper = () => {
  const { data } = trpc.viewer.me.useQuery();

  if (!data) return null;
  return <LandingPage {...(data as landingSetupProps)} />;
};

LandingPageWrapper.PageWrapper = PageWrapper;
LandingPageWrapper.getLayout = getLayout;

export default LandingPageWrapper;

// // If feature flag is disabled, return not found on getServerSideProps
// export const getServerSideProps = async () => {
//     const user = await prisma?.user.findFirst()

//   return {
//     user,
//   };
// };
