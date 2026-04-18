CREATE TABLE IF NOT EXISTS "CustomerAsset" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerAsset_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CustomerAsset_customerId_fkey'
  ) THEN
    ALTER TABLE "CustomerAsset"
    ADD CONSTRAINT "CustomerAsset_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CustomerAsset_customerId_category_createdAt_idx"
ON "CustomerAsset"("customerId", "category", "createdAt");
