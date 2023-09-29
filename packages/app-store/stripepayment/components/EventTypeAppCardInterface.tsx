import { usePathname } from "next/navigation";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Select } from "@calcom/ui";

import { paymentOptions } from "../lib/constants";
import type { appDataSchema } from "../zod";

type Option = { value: string; label: string };

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const pathname = usePathname();
  const [getAppData, setAppData, LockedIcon, disabled] = useAppContextWithSchema<typeof appDataSchema>();
  const currency = getAppData("currency");
  const paymentOption = getAppData("paymentOption");
  const paymentOptionSelectValue = paymentOptions.find((option) => paymentOption === option.value);
  const { enabled: requirePayment, updateEnabled: setRequirePayment } = useIsAppEnabled(app);

  const { t } = useLocale();
  const recurringEventDefined = eventType.recurringEvent?.count !== undefined;
  const seatsEnabled = !!eventType.seatsPerTimeSlot;

  return (
    <AppCard
      returnTo={WEBAPP_URL + pathname}
      setAppData={setAppData}
      app={app}
      disableSwitch={disabled}
      LockedIcon={LockedIcon}
      switchChecked={requirePayment}
      switchOnClick={(enabled) => {
        setRequirePayment(enabled);
      }}
      description={
        <>
          <div className="">
            {t("payment_app_commission", {
              paymentFeePercentage: 0.5,
              fee: 0.1,
              formatParams: { fee: { currency } },
            })}
          </div>
        </>
      }>
      <>
        {recurringEventDefined && (
          <Alert className="mt-2" severity="warning" title={t("warning_recurring_event_payment")} />
        )}
        {!recurringEventDefined && requirePayment && (
          <>
            <div className="mt-2 block items-center justify-start sm:flex sm:space-x-2">
              <Select<Option>
                defaultValue={
                  paymentOptionSelectValue
                    ? { ...paymentOptionSelectValue, label: t(paymentOptionSelectValue.label) }
                    : { ...paymentOptions[0], label: t(paymentOptions[0].label) }
                }
                options={paymentOptions.map((option) => {
                  return { ...option, label: t(option.label) || option.label };
                })}
                onChange={(input) => {
                  if (input) setAppData("paymentOption", input.value);
                }}
                className="mb-1 h-[38px] w-full"
                isDisabled={seatsEnabled || disabled}
              />
            </div>
            {seatsEnabled && paymentOption === "HOLD" && (
              <Alert className="mt-2" severity="warning" title={t("seats_and_no_show_fee_error")} />
            )}
          </>
        )}
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
