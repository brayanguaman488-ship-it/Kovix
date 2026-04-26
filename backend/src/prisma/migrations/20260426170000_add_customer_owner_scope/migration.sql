-- Add owner scope for customer records (store-level tenancy).
ALTER TABLE "Customer"
ADD COLUMN "createdByUserId" TEXT;

CREATE INDEX "Customer_createdByUserId_idx" ON "Customer"("createdByUserId");

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
