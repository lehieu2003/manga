-- Allow Firebase/Google accounts to map to local app users without a local password.
ALTER TABLE "User" ADD COLUMN "firebaseUid" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
