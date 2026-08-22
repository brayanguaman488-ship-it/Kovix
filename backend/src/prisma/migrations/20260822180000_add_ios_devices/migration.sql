CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS');

ALTER TABLE "Device"
  ADD COLUMN "platform" "DevicePlatform" NOT NULL DEFAULT 'ANDROID',
  ADD COLUMN "serialNumber" TEXT;

DROP INDEX IF EXISTS "Device_hexnodeDeviceId_key";
CREATE UNIQUE INDEX "Device_platform_hexnodeDeviceId_key" ON "Device"("platform", "hexnodeDeviceId");
CREATE INDEX "Device_platform_idx" ON "Device"("platform");
