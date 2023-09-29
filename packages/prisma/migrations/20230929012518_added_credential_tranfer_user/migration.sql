-- CreateTable
CREATE TABLE "TransferCredential" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "clabe" TEXT,
    "name" TEXT,
    "bank" TEXT,

    CONSTRAINT "TransferCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferCredential_userId_key" ON "TransferCredential"("userId");

-- AddForeignKey
ALTER TABLE "TransferCredential" ADD CONSTRAINT "TransferCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
