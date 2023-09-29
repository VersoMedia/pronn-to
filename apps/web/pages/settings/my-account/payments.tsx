import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  Meta,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  TextField,
} from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mb-8 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

type FormValues = {
  name: string;
  bank: string;
  clabe: string;
};

const TransferCredential = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const { data: user, isLoading } = trpc.viewer.me.useQuery();
  const updateProfileMutation = trpc.viewer.updateTransferCredential.useMutation({
    onSuccess: async (res) => {
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  if (isLoading || !user)
    return (
      <SkeletonLoader title={t("payments")} description={t("transfer_description", { appName: APP_NAME })} />
    );

  const defaultValues = {
    name: user?.transferCredential?.name || "",
    clabe: user?.transferCredential?.clabe || "",
    bank: user?.transferCredential?.bank || "",
  };

  return (
    <>
      <Meta title={t("payments")} description={t("transfer_description", { appName: APP_NAME })} />
      <ProfileForm
        key={JSON.stringify(defaultValues)}
        defaultValues={defaultValues}
        isLoading={updateProfileMutation.isLoading}
        onSubmit={(values) => {
          updateProfileMutation.mutate(values);
        }}
      />
    </>
  );
};

const ProfileForm = ({
  defaultValues,
  onSubmit,
  extraField,
  isLoading = false,
}: {
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => void;
  extraField?: React.ReactNode;
  isLoading: boolean;
}) => {
  const { t } = useLocale();

  const transferCredentialSchema = z.object({
    name: z.string(),
    clabe: z.string(),
    bank: z.string(),
  });

  const formMethods = useForm<FormValues>({
    defaultValues,
    resolver: zodResolver(transferCredentialSchema),
  });

  const {
    formState: { isSubmitting, isDirty },
  } = formMethods;

  const isDisabled = isSubmitting || !isDirty;

  return (
    <Form form={formMethods} handleSubmit={onSubmit}>
      {extraField}
      <div>
        <TextField label={t("name")} {...formMethods.register("name")} />
      </div>
      <div className="mt-4">
        <TextField label="Clabe" {...formMethods.register("clabe")} />
      </div>
      <div className="mt-4">
        <TextField label={t("bank")} {...formMethods.register("bank")} />
      </div>
      <Button loading={isLoading} disabled={isDisabled} color="primary" className="mt-8" type="submit">
        {t("update")}
      </Button>
    </Form>
  );
};

TransferCredential.getLayout = getLayout;
TransferCredential.PageWrapper = PageWrapper;

export default TransferCredential;
