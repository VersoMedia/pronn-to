-- CreateTable
CREATE TABLE "AttendeeManyBooking" (
    "id" SERIAL NOT NULL,
    "attendeeId" INTEGER NOT NULL,
    "bookingId" INTEGER NOT NULL,

    CONSTRAINT "AttendeeManyBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendeeManyBooking_attendeeId_idx" ON "AttendeeManyBooking"("attendeeId");

-- CreateIndex
CREATE INDEX "AttendeeManyBooking_bookingId_idx" ON "AttendeeManyBooking"("bookingId");

-- AddForeignKey
ALTER TABLE "AttendeeManyBooking" ADD CONSTRAINT "AttendeeManyBooking_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeManyBooking" ADD CONSTRAINT "AttendeeManyBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
