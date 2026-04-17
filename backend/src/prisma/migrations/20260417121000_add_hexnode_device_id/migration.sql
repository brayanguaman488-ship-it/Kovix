ALTER TABLE "Device" ADD COLUMN "hexnodeDeviceId" INTEGER;

CREATE UNIQUE INDEX "Device_hexnodeDeviceId_key" ON "Device"("hexnodeDeviceId");
