-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "paymentCash" BOOLEAN DEFAULT false,
ADD COLUMN     "paymentTransfer" BOOLEAN DEFAULT false;
