-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN     "phone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;
