import type { EventTypeSetup, FormValues } from "pages/event-types/[type]";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useFormContext, Controller } from "react-hook-form";

import { EventTypeAppCard } from "@calcom/app-store/_components/EventTypeAppCardInterface";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, SettingsToggle, TextField, Select } from "@calcom/ui";

export const EventPaymentTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  return (
    <div>
      <RecurringEventController eventType={eventType} />
    </div>
  );
};

type RecurringEventControllerProps = {
  eventType: EventTypeSetup;
};

const currencies = [
  { label: "Pesos MX", value: "MXN" },
  { label: "Dolar US", value: "USD" },
];

export default function RecurringEventController({ eventType }: RecurringEventControllerProps) {
  const { t } = useLocale();
  const { shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );

  const { data: eventTypeApps } = trpc.viewer.integrations.useQuery({
    extendsFeature: "EventType",
    teamId: eventType.team?.id || eventType.parent?.teamId,
  });

  const formMethods = useFormContext<FormValues>();
  const installedApps =
    eventTypeApps?.items.filter((app) => app.userCredentialIds.length || app.teams.length) || [];
  const notInstalledApps =
    eventTypeApps?.items.filter((app) => !app.userCredentialIds.length && !app.teams.length) || [];
  const allAppsData = formMethods.watch("metadata")?.apps || {};

  const setAllAppsData = (_allAppsData: typeof allAppsData) => {
    formMethods.setValue("metadata", {
      ...formMethods.getValues("metadata"),
      apps: _allAppsData,
    });
  };

  const getAppDataSetter = (appId: EventTypeAppsList): SetAppData => {
    return function (key, value) {
      // Always get latest data available in Form because consequent calls to setData would update the Form but not allAppsData(it would update during next render)
      const allAppsDataFromForm = formMethods.getValues("metadata")?.apps || {};
      const appData = allAppsDataFromForm[appId];

      let payload = {};
      if (appId === "stripe") {
        payload = {
          price: formMethods.getValues("price"),
        };
      }

      setAllAppsData({
        ...allAppsDataFromForm,
        [appId]: {
          ...appData,
          [key]: value,
          ...payload,
        },
      });
    };
  };

  const getAppDataGetter = (appId: EventTypeAppsList): GetAppData => {
    return function (key) {
      const appData = allAppsData[appId as keyof typeof allAppsData] || {};
      if (key) {
        return appData[key as keyof typeof appData];
      }
      return appData;
    };
  };

  const getCurrencySymbol = (locale: string, currency: string) =>
    (0)
      .toLocaleString(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\d/g, "")
      .trim();

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <>
          <Controller
            name="paymentCash"
            control={formMethods.control}
            defaultValue={eventType.hideCalendarNotes}
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center justify-between">
                <div className="w-[100%]">
                  <label className="text-emphasis mb-2 block text-sm font-semibold leading-none">
                    {t("payment_cash")}
                  </label>
                  <p className="text-default -mt-1.5 text-sm leading-normal">
                    {t("payment_cash_description")}
                  </p>
                </div>
                <SettingsToggle className="!w-[7%]" checked={value} onCheckedChange={(e) => onChange(e)} />
              </div>
            )}
          />
          <hr className="border-subtle my-4" />
          <Controller
            name="paymentTransfer"
            control={formMethods.control}
            defaultValue={eventType.hideCalendarNotes}
            render={({ field: { value, onChange } }) => (
              <div className="flex items-center justify-between">
                <div className="w-[100%]">
                  <label className="text-emphasis mb-2 block text-sm font-semibold leading-none">
                    {t("payment_transfer")}
                  </label>
                  <p className="text-default -mt-1.5 text-sm leading-normal">
                    {t("payment_transfer_description")}
                  </p>
                </div>
                <SettingsToggle className="!w-[7%]" checked={value} onCheckedChange={(e) => onChange(e)} />
              </div>
            )}
          />
          {formMethods.watch("paymentTransfer") && (
            <div className="mt-2">
              <Alert severity="info" title={t("alert_transfer")} />
            </div>
          )}
          <hr className="border-subtle my-4" />
          {installedApps.map((app) => {
            if (!app.teams.length)
              return (
                <EventTypeAppCard
                  getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
                  setAppData={getAppDataSetter(app.slug as EventTypeAppsList)}
                  key={app.slug}
                  app={app}
                  eventType={eventType}
                  {...shouldLockDisableProps("apps")}
                />
              );
          })}
          {notInstalledApps?.map((app) => (
            <EventTypeAppCard
              getAppData={getAppDataGetter(app.slug as EventTypeAppsList)}
              setAppData={getAppDataSetter(app.slug as EventTypeAppsList)}
              key={app.slug}
              app={app}
              eventType={eventType}
            />
          ))}
          <hr className="border-subtle my-4" />
          <div className="flex w-full flex-row gap-x-2">
            <Select
              isSearchable={true}
              onChange={(val) => {
                if (val) formMethods.setValue("currency", val.value);
              }}
              defaultValue={
                currencies.find((option) => option.value === formMethods.getValues("currency")) ||
                currencies[1]
              }
              className="min-w-[20%]"
              options={currencies}
            />
            <div className="w-full">
              <TextField
                label=""
                className="h-[38px]"
                addOnLeading={
                  <>
                    {formMethods.watch("currency")
                      ? getCurrencySymbol("en", formMethods.getValues("currency"))
                      : ""}
                  </>
                }
                addOnClassname="h-[38px]"
                step="0.01"
                min="0.5"
                type="number"
                required
                placeholder="Price"
                onChange={(e) => {
                  formMethods.setValue("price", Number(e.target.value) * 100);
                }}
                defaultValue={
                  formMethods.getValues("price") > 0 ? formMethods.getValues("price") / 100 : undefined
                }
              />
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
