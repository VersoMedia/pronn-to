import type { GetServerSidePropsContext, NextApiResponse } from "next";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { type TUpdateTransferCredentialInputSchema } from "./updateTransferCredential.schema";

type UpdateProfileOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
  input: TUpdateTransferCredentialInputSchema;
};

export const updateTransferCredential = async ({ ctx, input }: UpdateProfileOptions) => {
  const { user } = ctx;
  const data = {
    ...input,
  };

  const updatedUser = await prisma.transferCredential.upsert({
    where: {
      id: user.id,
    },
    create: { ...data, userId: user.id },
    update: data,
  });

  return { ...updatedUser };
};
