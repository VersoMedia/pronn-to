import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { sendNotification } from "@calcom/features/bookings/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Button, TextArea } from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";

type Props = {
  booking: any;
  profile: {
    name: string | null;
    slug: string | null;
  };
  recurringEvent: RecurringEvent | null;
  team?: string | null;
  setIsCancellationMode: (value: boolean) => void;
  theme: string | null;
  allRemainingBookings: boolean;
  seatReferenceUid?: string;
};

export default function CancelBooking(props: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const asPath = `${pathname}?${searchParams.toString()}`;
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const { t } = useLocale();
  const router = useRouter();
  const { booking, allRemainingBookings, seatReferenceUid } = props;
  const [loading, setLoading] = useState(false);
  const telemetry = useTelemetry();
  const [error, setError] = useState<string | null>(booking ? null : t("booking_already_cancelled"));

  const cancelBookingRef = useCallback((node: HTMLTextAreaElement) => {
    if (node !== null) {
      node.scrollIntoView({ behavior: "smooth" });
      node.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {error && (
        <div className="mt-8">
          <div className="bg-error mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-title">
              {error}
            </h3>
          </div>
        </div>
      )}
      {!error && (
        <div className="mt-5 sm:mt-6">
          <label className="text-default font-medium">{t("cancellation_reason")}</label>
          <TextArea
            data-testid="cancel_reason"
            ref={cancelBookingRef}
            placeholder={t("cancellation_reason_placeholder")}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            className="mb-4 mt-2 w-full "
            rows={3}
          />
          <div className="flex flex-col-reverse rtl:space-x-reverse ">
            <div className="ml-auto flex w-full space-x-4 ">
              <Button
                className="ml-auto"
                color="secondary"
                onClick={() => props.setIsCancellationMode(false)}>
                {t("nevermind")}
              </Button>
              <Button
                data-testid="confirm_cancel"
                onClick={async () => {
                  setLoading(true);

                  telemetry.event(telemetryEventTypes.bookingCancelled, collectPageParameters());

                  const res = await fetch("/api/cancel", {
                    body: JSON.stringify({
                      uid: booking?.uid,
                      cancellationReason: cancellationReason,
                      allRemainingBookings,
                      // @NOTE: very important this shouldn't cancel with number ID use uid instead
                      seatReferenceUid,
                    }),
                    headers: {
                      "Content-Type": "application/json",
                    },
                    method: "POST",
                  });

                  if (res.status >= 200 && res.status < 300) {
                    const types = [
                      "MEMBER_BOOKING_CANCELLATION_CUSTOMER",
                      "CUSTOMER_BOOKING_CANCELLATION_MEMBER",
                    ];
                    for (let i = 0; i < types.length; i++) {
                      const payload = {
                        member_email: booking?.user?.email ? booking?.user?.email : "Sin correo",
                        member_phone: booking?.user?.phone,
                        member_name: booking?.user?.name,
                        customer_name: booking?.responses?.name,
                        customer_email: booking?.responses?.email ? booking?.responses?.email : "Sin correo",
                        customer_phone: booking?.responses?.phone,
                        type_: types[i],
                      };

                      (async () => {
                        await sendNotification(payload);
                      })();
                    }

                    router.replace(asPath);
                  } else {
                    setLoading(false);
                    setError(
                      `${t("error_with_status_code_occured", { status: res.status })} ${t(
                        "please_try_again"
                      )}`
                    );
                  }
                }}
                loading={loading}>
                {props.allRemainingBookings ? t("cancel_all_remaining") : t("cancel_event")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
