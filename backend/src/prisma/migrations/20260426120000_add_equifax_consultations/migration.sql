DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'EquifaxConsultationStatus'
  ) THEN
    CREATE TYPE "EquifaxConsultationStatus" AS ENUM ('PENDIENTE', 'RESPONDIDA');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "EquifaxConsultation" (
  "id" TEXT NOT NULL,
  "queryNationalId" TEXT NOT NULL,
  "queryFullName" TEXT NOT NULL,
  "queryNotes" TEXT,
  "status" "EquifaxConsultationStatus" NOT NULL DEFAULT 'PENDIENTE',
  "responseNationalId" TEXT,
  "responseFullName" TEXT,
  "hasGoodCredit" BOOLEAN,
  "highEndPhoneEligible" BOOLEAN,
  "maxDebtAmount" DECIMAL(10,2),
  "responseNotes" TEXT,
  "requestedByUserId" TEXT,
  "respondedByUserId" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EquifaxConsultation_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EquifaxConsultation_requestedByUserId_fkey'
  ) THEN
    ALTER TABLE "EquifaxConsultation"
    ADD CONSTRAINT "EquifaxConsultation_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EquifaxConsultation_respondedByUserId_fkey'
  ) THEN
    ALTER TABLE "EquifaxConsultation"
    ADD CONSTRAINT "EquifaxConsultation_respondedByUserId_fkey"
    FOREIGN KEY ("respondedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "EquifaxConsultation_status_createdAt_idx"
ON "EquifaxConsultation"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "EquifaxConsultation_queryNationalId_idx"
ON "EquifaxConsultation"("queryNationalId");
