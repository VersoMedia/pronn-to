-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE INDEX "Attendee_userId_idx" ON "Attendee"("userId");

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
