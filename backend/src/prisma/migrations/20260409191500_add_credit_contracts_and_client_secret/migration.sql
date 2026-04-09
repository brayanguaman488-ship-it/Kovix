-- CreateEnum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreditContractStatus') THEN
    CREATE TYPE "CreditContractStatus" AS ENUM ('ACTIVO', 'CERRADO', 'CANCELADO');
  END IF;
END $$;

-- CreateEnum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InstallmentStatus') THEN
    CREATE TYPE "InstallmentStatus" AS ENUM ('PENDIENTE', 'REPORTADO', 'PAGADO', 'VENCIDO', 'CANCELADO');
  END IF;
END $$;

-- Add clientSecret to Device if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Device' AND column_name = 'clientSecret'
  ) THEN
    ALTER TABLE "Device" ADD COLUMN "clientSecret" TEXT;
  END IF;
END $$;

-- Backfill clientSecret for existing rows
UPDATE "Device"
SET "clientSecret" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "clientSecret" IS NULL;

-- Enforce non-null + unique for clientSecret
ALTER TABLE "Device" ALTER COLUMN "clientSecret" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Device_clientSecret_key'
  ) THEN
    CREATE UNIQUE INDEX "Device_clientSecret_key" ON "Device"("clientSecret");
  END IF;
END $$;

-- CreateTable CreditContract
CREATE TABLE IF NOT EXISTS "CreditContract" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "principalAmount" DECIMAL(10,2) NOT NULL,
  "downPaymentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "financedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "installmentCount" INTEGER NOT NULL,
  "installmentAmount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "startDate" TIMESTAMP(3) NOT NULL,
  "status" "CreditContractStatus" NOT NULL DEFAULT 'ACTIVO',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreditContract_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'CreditContract_deviceId_key'
  ) THEN
    CREATE UNIQUE INDEX "CreditContract_deviceId_key" ON "CreditContract"("deviceId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'CreditContract_customerId_idx'
  ) THEN
    CREATE INDEX "CreditContract_customerId_idx" ON "CreditContract"("customerId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'CreditContract_status_idx'
  ) THEN
    CREATE INDEX "CreditContract_status_idx" ON "CreditContract"("status");
  END IF;
END $$;

-- CreateTable Installment
CREATE TABLE IF NOT EXISTS "Installment" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDIENTE',
  "reportedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "paymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Installment_paymentId_key'
  ) THEN
    CREATE UNIQUE INDEX "Installment_paymentId_key" ON "Installment"("paymentId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Installment_contractId_sequence_key'
  ) THEN
    CREATE UNIQUE INDEX "Installment_contractId_sequence_key" ON "Installment"("contractId", "sequence");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Installment_contractId_dueDate_idx'
  ) THEN
    CREATE INDEX "Installment_contractId_dueDate_idx" ON "Installment"("contractId", "dueDate");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Installment_status_dueDate_idx'
  ) THEN
    CREATE INDEX "Installment_status_dueDate_idx" ON "Installment"("status", "dueDate");
  END IF;
END $$;

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreditContract_customerId_fkey'
  ) THEN
    ALTER TABLE "CreditContract"
      ADD CONSTRAINT "CreditContract_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreditContract_deviceId_fkey'
  ) THEN
    ALTER TABLE "CreditContract"
      ADD CONSTRAINT "CreditContract_deviceId_fkey"
      FOREIGN KEY ("deviceId") REFERENCES "Device"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Installment_contractId_fkey'
  ) THEN
    ALTER TABLE "Installment"
      ADD CONSTRAINT "Installment_contractId_fkey"
      FOREIGN KEY ("contractId") REFERENCES "CreditContract"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Installment_paymentId_fkey'
  ) THEN
    ALTER TABLE "Installment"
      ADD CONSTRAINT "Installment_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
