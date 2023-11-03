-- AlterTable
ALTER TABLE "NotificationSettings" ADD COLUMN     "confirmationQuote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textConfirmationQuote" TEXT DEFAULT '';
