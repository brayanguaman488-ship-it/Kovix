ALTER TABLE "ConvenioDevice"
  ADD COLUMN "installmentCount" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "ConvenioPayment"
  ADD COLUMN "sequence" INTEGER,
  ADD COLUMN "discountSkippedAt" TIMESTAMP(3),
  ADD COLUMN "discountSkippedByUserId" TEXT;

CREATE INDEX "ConvenioPayment_convenioDeviceId_sequence_idx"
  ON "ConvenioPayment"("convenioDeviceId", "sequence");
