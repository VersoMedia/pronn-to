import { usePathname } from "next/navigation";
import { useState } from "react";

import { useIntercom } from "@calcom/features/ee/support/lib/intercom/useIntercom";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

interface CtaRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

const CtaRow = ({ title, description, className, children }: CtaRowProps) => {
  return (
    <>
      <section className={classNames("text-default flex flex-col sm:flex-row", className)}>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pl-3 sm:pt-0">{children}</div>
      </section>
      <hr className="border-subtle" />
    </>
  );
};

const PlanSelectionForm = ({
  onChange,
  plans = [],
}: {
  onChange: (stripePriceId: string) => void;
  plans: any;
}) => {
  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        return (
          <div key={plan.price} className="rounded border border-inherit px-4 py-1">
            <label className="w-full flex-col items-center">
              <label htmlFor={plan.stripePriceId} className=" gap-x-3">
                <input
                  type="radio"
                  value={plan.stripePriceId}
                  name="plan"
                  id={plan.stripePriceId}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  onChange={(e) => onChange(plan.stripePriceId)}
                />
                <div>
                  <p className="text-md block font-medium leading-6 text-black">{plan.name}</p>
                  <p className="block text-sm font-medium leading-6 text-gray-900">{plan.description}</p>
                </div>
              </label>
              <div className="text-right">{plan.price}</div>
            </label>
          </div>
        );
      })}
    </div>
  );
};

const PRICE_MONTH = "process.env.PRICE_MONTH";
const PRICE_YEAR = "process.env.PRICE_YEAR";
const plans = [
  {
    name: "Suscripción Mensual",
    description:
      "Servicios y citas ilimitadas, Agenda interna y registro de clientes, Perfil personalizable, Confirmaciones por correo y WhatsApp, Acceso a nuestra comunidad 😜",
    price: "$599.00/Mes",
    stripePriceId: PRICE_MONTH,
  },
  {
    name: "Membresía Anual",
    description:
      "Servicios y citas ilimitadas, Agenda interna y registro de clientes, Perfil personalizable, Confirmaciones por correo y WhatsApp, Acceso a nuestra comunidad 😜, 10%(OFF).",
    price: "$6,000.00/Año", //añadir descuento del 15%
    stripePriceId: PRICE_YEAR,
  },
];

const MembershipView = () => {
  const pathname = usePathname();
  const { t } = useLocale();
  const { open } = useIntercom();
  const returnTo = pathname;
  const billingHref = `/api/integrations/stripepayment/portal?returnTo=${WEBAPP_URL}${returnTo}`;

  const [priceStripe, setPriceStripe] = useState("price_1N6MO1DfEqa340LQDa1QKnZa");
  const [subscription, setSubscription] = useState({});
  const [plan, setPlan] = useState({
    name: "",
    description: "",
    price: "",
    stripePriceId: "",
  });

  const onContactSupportClick = async () => {
    //await open();
  };

  const handleCheckout = async () => {
    try {
      const {
        data: { sessionId },
      } = await fetch("/api/membership/create-checkout-session", {
        method: "POST",
        body: {
          price: priceStripe,
        },
      }).then(async (resp) => await resp.json());

      const stripe = await getStripe();
      stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      return alert(error?.message);
    }
  };

  const handleAdminSubscription = async () => {
    try {
      const resp = await fetch("/api/membership/create-portal-link", { method: "POST" }).then(
        async (resp) => await resp.json()
      );
      if (resp.data?.url) window.location.assign(resp.data?.url);
    } catch (error) {
      if (error) return alert(error?.message);
    }
  };

  return (
    <>
      <Meta title={t("membership")} description={t("manage_membership_description")} />
      <div className="max-w-screen-sm space-y-6 text-sm sm:space-y-8">
        {subscription.id && subscription.status === "active" ? (
          <>
            <div className="rounded border border-inherit px-4 py-1">
              <div className="w-full flex-col items-center">
                <div className="gap-x-3 pt-3">
                  <div>
                    <p className="text-md block font-medium leading-6 text-black">
                      Tú subscripción actual: {plan.name}
                    </p>
                    <p className="block text-sm font-medium leading-6 text-gray-900">{plan.description}</p>
                  </div>
                </div>
                <div className="text-right">{plan.price}</div>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-sm bg-black py-2 text-white"
              onClick={handleAdminSubscription}>
              Administrar suscripción
            </button>
          </>
        ) : (
          <>
            <PlanSelectionForm plans={plans} onChange={setPriceStripe} />
            <button
              type="button"
              className="my-3 w-full rounded-sm bg-black py-2 text-white"
              onClick={handleCheckout}>
              Subscribirse
            </button>
          </>
        )}
        <CtaRow title={t("need_anything_else")} description={t("further_billing_help")}>
          <Button color="secondary" onClick={onContactSupportClick}>
            {t("contact_support")}
          </Button>
        </CtaRow>
      </div>
    </>
  );
};

MembershipView.getLayout = getLayout;
MembershipView.PageWrapper = PageWrapper;

export default MembershipView;
