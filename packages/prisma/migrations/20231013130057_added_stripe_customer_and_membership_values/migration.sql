-- AlterTable
ALTER TABLE "users" ADD COLUMN     "freeTrial" TEXT,
ADD COLUMN     "paymentMembership" JSONB,
ADD COLUMN     "stripe_customer_id" TEXT;
