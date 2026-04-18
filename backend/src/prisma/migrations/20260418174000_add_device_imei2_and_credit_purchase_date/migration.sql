ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "imei2" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Device_imei2_key'
  ) THEN
    CREATE UNIQUE INDEX "Device_imei2_key" ON "Device"("imei2");
  END IF;
END $$;

ALTER TABLE "CreditContract" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3);
UPDATE "CreditContract" SET "purchaseDate" = "startDate" WHERE "purchaseDate" IS NULL;
ALTER TABLE "CreditContract" ALTER COLUMN "purchaseDate" SET NOT NULL;
