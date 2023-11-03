import { Controller, useForm } from "react-hook-form";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  Label,
  Meta,
  SettingsToggle,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  TextField,
  PhoneInput,
} from "@calcom/ui";

import { withQuery } from "@lib/QueryCell";

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mb-8 mt-6 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

interface NotificationViewProps {
  localeProp: string;
  user: RouterOutputs["viewer"]["me"];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WithQuery = withQuery(trpc.viewer.public.i18n as any, undefined, {
  trpc: { context: { skipBatch: true } },
});

const Notifications = () => {
  const { t } = useLocale();

  const { data: user, isLoading } = trpc.viewer.me.useQuery();
  if (isLoading)
    return <SkeletonLoader title={t("notifications")} description={t("notification_description")} />;
  if (!user) {
    throw new Error(t("something_went_wrong"));
  }
  return (
    <WithQuery
      success={({ data }) => <NotificationView user={user} />}
      customLoader={<SkeletonLoader title={t("notifications")} description={t("notification_description")} />}
    />
  );
};

const NotificationView = ({ user }: NotificationViewProps) => {
  const { t } = useLocale();

  const mutation = trpc.viewer.updateNotifications.useMutation({
    onSuccess: async () => {
      reset(getValues());
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const formMethods = useForm({
    defaultValues: {
      phone: user.phone,
      memberWhats: user.notificationSettings?.memberWhats ?? false,
      customerWhats: user.notificationSettings?.customerWhats ?? false,
      twoDays: user.notificationSettings?.twoDays ?? false,
      oneDay: user.notificationSettings?.oneDay ?? false,
      twelveHours: user.notificationSettings?.twelveHours ?? false,
      sixHours: user.notificationSettings?.sixHours ?? false,
      oneHour: user.notificationSettings?.oneHour ?? false,
      thirtyMinutes: user.notificationSettings?.thirtyMinutes ?? false,
      textTwoDays: user.notificationSettings?.textTwoDays ?? "",
      textOneDays: user.notificationSettings?.textOneDays ?? "",
      textTwelveHours: user.notificationSettings?.textTwelveHours ?? "",
      textSixHours: user.notificationSettings?.textSixHours ?? "",
      textOneHours: user.notificationSettings?.textOneHours ?? "",
      textThirtyMinutes: user.notificationSettings?.textThirtyMinutes ?? "",

      textConfirmationQuote: user.notificationSettings?.textConfirmationQuote ?? "",
      confirmQuote: user.notificationSettings?.confirmQuote ?? "",
    },
  });
  const {
    formState: { isDirty, isSubmitting },
    reset,
    getValues,
  } = formMethods;
  const isDisabled = isSubmitting || !isDirty;

  return (
    <Form
      form={formMethods}
      className="grid grid-cols-1 md:grid-cols-2"
      handleSubmit={(values) => {
        mutation.mutate({
          ...values,
        });
      }}>
      <div>
        <Meta title={t("notifications")} description={t("notification_description")} />
        <div className="mt-2">
          <Label className="pb-[32px] text-[16px]">WhatsApp</Label>
          <Controller
            name="memberWhats"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("enable_notifications_for_me")}
                description={t("notificaiones_for_me_description")}
                checked={formMethods.getValues("memberWhats")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("memberWhats", checked, { shouldDirty: true });
                }}
              />
            )}
          />
          {formMethods.watch("memberWhats") && (
            <Controller
              control={formMethods.control}
              name="phone"
              render={({ field: { value, onChange } }) => (
                <PhoneInput
                  className="rounded-md"
                  placeholder={t("phone_number")}
                  id="phone"
                  required
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          )}
        </div>

        <div className="mt-8">
          <Controller
            name="customerWhats"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("enable_notifications_for_attendee")}
                description={t("notificaiones_for_me_description")}
                checked={formMethods.getValues("customerWhats")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("customerWhats", checked, { shouldDirty: true });
                }}
              />
            )}
          />
        </div>
        <Label className="mt-8 pb-[32px] text-[16px]">{t("confirm_to_quote")}</Label>
        <div className="mt-2">
          <Controller
            name="confirmQuote"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("confirmation_quote")}
                checked={formMethods.getValues("confirmQuote")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("confirmQuote", checked, { shouldDirty: true });
                }}
              />
            )}
          />
          {formMethods.watch("confirmQuote") && (
            <TextField
              label={null}
              placeholder={t("custom_text_confirmation_quote")}
              {...formMethods.register("textConfirmationQuote")}
            />
          )}
        </div>

        <Label className="mt-8 pb-[32px] text-[16px]">{t("reminder_whatsapp")}</Label>

        <div className="mt-2">
          <Controller
            name="twoDays"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("reminder_time_whatsapp", { day: "2 day" })}
                checked={formMethods.getValues("twoDays")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("twoDays", checked, { shouldDirty: true });
                }}
              />
            )}
          />
          {formMethods.watch("twoDays") && (
            <TextField
              label={null}
              placeholder={t("custom_text_reminder", { day: "2 days" })}
              {...formMethods.register("textTwoDays")}
            />
          )}
        </div>
        <div className="mt-6">
          <Controller
            name="oneDay"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("reminder_time_whatsapp", { day: "1 day" })}
                checked={formMethods.getValues("oneDay")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("oneDay", checked, { shouldDirty: true });
                }}
              />
            )}
          />
          {formMethods.watch("oneDay") && (
            <TextField
              label={null}
              placeholder={t("custom_text_reminder", { day: "1 day" })}
              {...formMethods.register("textOneDays")}
            />
          )}
        </div>

        <div className="mt-6">
          <Controller
            name="twelveHours"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("reminder_time_whatsapp", { day: "12 hours" })}
                checked={formMethods.getValues("twelveHours")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("twelveHours", checked, { shouldDirty: true });
                }}
              />
            )}
          />
          {formMethods.watch("twelveHours") && (
            <TextField
              label={null}
              placeholder={t("custom_text_reminder", { day: "12 hours" })}
              {...formMethods.register("textTwelveHours")}
            />
          )}
        </div>
        <div className="mt-6">
          <Controller
            name="sixHours"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("reminder_time_whatsapp", { day: "6 hours" })}
                checked={formMethods.getValues("sixHours")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("sixHours", checked, { shouldDirty: true });
                }}
              />
            )}
          />
          {formMethods.watch("sixHours") && (
            <TextField
              label={null}
              placeholder={t("custom_text_reminder", { day: "6 hours" })}
              {...formMethods.register("textSixHours")}
            />
          )}
        </div>
        <div className="mt-6">
          <Controller
            name="oneHour"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("reminder_time_whatsapp", { day: "1 hour" })}
                checked={formMethods.getValues("oneHour")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("oneHour", checked, { shouldDirty: true });
                }}
              />
            )}
          />
          {formMethods.watch("oneHour") && (
            <TextField
              label={null}
              placeholder={t("custom_text_reminder", { day: "1 hour" })}
              {...formMethods.register("textOneHours")}
            />
          )}
        </div>
        <div className="mt-6">
          <Controller
            name="thirtyMinutes"
            control={formMethods.control}
            render={() => (
              <SettingsToggle
                title={t("reminder_time_whatsapp", { day: "30 minutes" })}
                checked={formMethods.getValues("thirtyMinutes")}
                onCheckedChange={(checked) => {
                  formMethods.setValue("thirtyMinutes", checked, { shouldDirty: true });
                }}
              />
            )}
          />
          {formMethods.watch("thirtyMinutes") && (
            <TextField
              label={null}
              placeholder={t("custom_text_reminder", { day: "30 minutes" })}
              {...formMethods.register("textThirtyMinutes")}
            />
          )}
        </div>

        <Button
          loading={mutation.isLoading}
          disabled={isDisabled}
          color="primary"
          type="submit"
          className="mt-8">
          <>{t("update")}</>
        </Button>
      </div>
    </Form>
  );
};

Notifications.getLayout = getLayout;
Notifications.PageWrapper = PageWrapper;

export default Notifications;
