CREATE TABLE "PushDeviceToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "deviceId" TEXT,
  "appVersion" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PushDeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushDeviceToken_token_key" ON "PushDeviceToken"("token");
CREATE INDEX "PushDeviceToken_userId_revokedAt_lastSeenAt_idx" ON "PushDeviceToken"("userId", "revokedAt", "lastSeenAt");
CREATE INDEX "PushDeviceToken_platform_revokedAt_idx" ON "PushDeviceToken"("platform", "revokedAt");

ALTER TABLE "PushDeviceToken"
  ADD CONSTRAINT "PushDeviceToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
