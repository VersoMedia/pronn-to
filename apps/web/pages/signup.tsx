import { zodResolver } from "@hookform/resolvers/zod";
import type { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import type { SubmitHandler } from "react-hook-form";
import { FormProvider, useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { sendNotification } from "@calcom/features/bookings/lib";
import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import { getOrgFullDomain } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { IS_SELF_HOSTED, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { analytics, events_analytics } from "@calcom/lib/segment";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Alert, Button, EmailField, HeadSeo, PasswordField, TextField, PhoneInput, Label } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { IS_GOOGLE_LOGIN_ENABLED } from "../server/lib/constants";
import { ssrInit } from "../server/lib/ssr";

const signupSchema = z.object({
  username: z.string().refine((value) => !value.includes("+"), {
    message: "String should not contain a plus symbol (+).",
  }),
  email: z.string().email(),
  phone: z
    .string()
    .min(10, { message: "Must be a valid mobile number" })
    .max(14, { message: "Must be a valid mobile number" }),
  password: z.string().min(7),
  language: z.string().optional(),
  token: z.string().optional(),
  apiError: z.string().optional(), // Needed to display API errors doesnt get passed to the API
});

type FormValues = z.infer<typeof signupSchema>;

type SignupProps = inferSSRProps<typeof getServerSideProps>;

export default function Signup({ prepopulateFormValues, token, orgSlug }: SignupProps) {
  const searchParams = useSearchParams();
  const telemetry = useTelemetry();
  const { t, i18n } = useLocale();
  const flags = useFlagMap();
  const methods = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: prepopulateFormValues,
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = methods;

  const handleErrors = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
  };

  const signUp: SubmitHandler<FormValues> = async (data) => {
    await fetch("/api/auth/signup", {
      body: JSON.stringify({
        ...data,
        language: i18n.language,
        token,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })
      .then(handleErrors)
      .then(async () => {
        telemetry.event(telemetryEventTypes.signup, collectPageParameters());
        analytics.track(events_analytics.SINGUP, {
          username: data?.username,
          email: data?.email,
          phone: data?.phone,
        });

        const payload = {
          type_: "FIRST_MESSAGE_MEMBER",
          member_username: data.username,
          member_phone: data.phone,
          member_name: data.username,
        };
        await sendNotification(payload);

        const verifyOrGettingStarted = "getting-started"; //flags["email-verification"] ? "auth/verify-email" :
        await signIn<"credentials">("credentials", {
          ...data,
          callbackUrl: `${
            searchParams?.get("callbackUrl")
              ? `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`
              : `${WEBAPP_URL}/${verifyOrGettingStarted}`
          }?from=signup`,
        });
      })
      .catch((err) => {
        methods.setError("apiError", { message: err.message });
      });
  };

  return (
    <>
      <div
        className="bg-muted flex min-h-screen flex-col justify-center "
        style={
          {
            "--cal-brand": "#111827",
            "--cal-brand-emphasis": "#101010",
            "--cal-brand-text": "white",
            "--cal-brand-subtle": "#9CA3AF",
          } as CSSProperties
        }
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true">
        <HeadSeo title={t("sign_up")} description={t("sign_up")} />
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="font-cal text-emphasis text-center text-3xl font-extrabold">
            {t("create_your_account")}
          </h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-default mx-2 p-6 shadow sm:rounded-lg lg:p-8">
            <FormProvider {...methods}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (methods.formState?.errors?.apiError) {
                    methods.clearErrors("apiError");
                  }
                  methods.handleSubmit(signUp)(event);
                }}
                className="bg-default space-y-6">
                {errors.apiError && <Alert severity="error" message={errors.apiError?.message} />}
                <div className="space-y-4">
                  <TextField
                    addOnLeading={
                      orgSlug
                        ? getOrgFullDomain(orgSlug, { protocol: false })
                        : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/`
                    }
                    {...register("username")}
                    required
                  />
                  <EmailField
                    {...register("email")}
                    disabled={prepopulateFormValues?.email}
                    className="disabled:bg-emphasis disabled:hover:cursor-not-allowed"
                  />
                  <div>
                    <Label>{t("phone_number")}</Label>
                    <Controller
                      control={methods.control}
                      name="phone"
                      render={({ field: { value, onChange } }) => (
                        <PhoneInput
                          className="rounded-md"
                          placeholder={t("enter_phone_number")}
                          id="phone"
                          required
                          value={value}
                          onChange={onChange}
                        />
                      )}
                    />
                  </div>

                  <PasswordField
                    labelProps={{
                      className: "block text-sm font-medium text-default",
                    }}
                    {...register("password")}
                    hintErrors={["caplow", "min", "num"]}
                    className="border-default mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
                  />
                </div>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <Button type="submit" loading={isSubmitting} className="w-full justify-center">
                    {t("create_account")}
                  </Button>
                  {!token && (
                    <Button
                      color="secondary"
                      className="w-full justify-center"
                      onClick={() =>
                        signIn("Cal.com", {
                          callbackUrl: searchParams?.get("callbackUrl")
                            ? `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`
                            : `${WEBAPP_URL}/getting-started`,
                        })
                      }>
                      {t("login_instead")}
                    </Button>
                  )}
                </div>
              </form>
            </FormProvider>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);
  const ssr = await ssrInit(ctx);
  const token = z.string().optional().parse(ctx.query.token);

  const props = {
    isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
    isSAMLLoginEnabled,
    trpcState: ssr.dehydrate(),
    prepopulateFormValues: undefined,
  };

  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true" || flags["disable-signup"]) {
    console.log({ flag: flags["disable-signup"] });

    return {
      notFound: true,
    };
  }

  // no token given, treat as a normal signup without verification token
  if (!token) {
    return {
      props: JSON.parse(JSON.stringify(props)),
    };
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      token,
    },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return {
      notFound: true,
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      AND: [
        {
          email: verificationToken?.identifier,
        },
        {
          emailVerified: {
            not: null,
          },
        },
      ],
    },
  });

  if (existingUser) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login?callbackUrl=" + `${WEBAPP_URL}/${ctx.query.callbackUrl}`,
      },
    };
  }

  const guessUsernameFromEmail = (email: string) => {
    const [username] = email.split("@");
    return username;
  };

  let username = guessUsernameFromEmail(verificationToken.identifier);

  const orgInfo = await prisma.user.findFirst({
    where: {
      email: verificationToken?.identifier,
    },
    select: {
      organization: {
        select: {
          slug: true,
          metadata: true,
        },
      },
    },
  });

  const userOrgMetadata = teamMetadataSchema.parse(orgInfo?.organization?.metadata ?? {});

  if (!IS_SELF_HOSTED) {
    // Im not sure we actually hit this because of next redirects signup to website repo - but just in case this is pretty cool :)
    const { available, suggestion } = await checkPremiumUsername(username);

    username = available ? username : suggestion || username;
  }

  // Transform all + to - in username
  username = username.replace(/\+/g, "-");

  return {
    props: {
      ...props,
      token,
      prepopulateFormValues: {
        email: verificationToken.identifier,
        username,
      },
      orgSlug: (orgInfo?.organization?.slug || userOrgMetadata?.requestedSlug) ?? null,
    },
  };
};

Signup.isThemeSupported = false;
Signup.PageWrapper = PageWrapper;
