-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" SERIAL NOT NULL,
    "customerWhats" BOOLEAN NOT NULL DEFAULT false,
    "customerEmail" BOOLEAN NOT NULL DEFAULT false,
    "customerSms" BOOLEAN NOT NULL DEFAULT false,
    "memberWhats" BOOLEAN NOT NULL DEFAULT false,
    "memberEmail" BOOLEAN NOT NULL DEFAULT false,
    "memberSms" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "oneDay" BOOLEAN NOT NULL DEFAULT true,
    "oneHour" BOOLEAN NOT NULL DEFAULT true,
    "sixHours" BOOLEAN NOT NULL DEFAULT false,
    "twelveHours" BOOLEAN NOT NULL DEFAULT false,
    "twoDays" BOOLEAN NOT NULL DEFAULT false,
    "textOneDays" TEXT DEFAULT '',
    "textOneHours" TEXT DEFAULT '',
    "textSixHours" TEXT DEFAULT '',
    "textTwelveHours" TEXT DEFAULT '',
    "textTwoDays" TEXT DEFAULT '',
    "textThirtyMinutes" TEXT DEFAULT '',
    "thirtyMinutes" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_userId_key" ON "NotificationSettings"("userId");

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
