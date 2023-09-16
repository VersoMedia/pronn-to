-- CreateTable
CREATE TABLE "BookingNotifications" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "whatsConfirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsCustomerConfirmationAnswered" BOOLEAN NOT NULL DEFAULT false,
    "whatsCustomerConfirmationTrackId" TEXT,
    "whatsCustomerDayReminderAnswered" BOOLEAN NOT NULL DEFAULT false,
    "whatsCustomerDayReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsCustomerDayReminderTrackId" TEXT,
    "whatsCustomerMemberDayReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsMemberDayReminderAnswered" BOOLEAN NOT NULL DEFAULT false,
    "whatsMemberDayReminderTrackId" TEXT,
    "whatsMemberHourReminderAnswered" BOOLEAN NOT NULL DEFAULT false,
    "whatsMemberHourReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsMemberHourReminderTrackId" TEXT,

    CONSTRAINT "BookingNotifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingNotifications_bookingId_key" ON "BookingNotifications"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingNotifications" ADD CONSTRAINT "BookingNotifications_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
