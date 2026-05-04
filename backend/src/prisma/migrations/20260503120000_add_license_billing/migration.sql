CREATE TABLE "LicensePricingRule" (
  "id" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL DEFAULT 'global',
  "scopeUserId" TEXT,
  "tierKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "minAmount" DECIMAL(10,2) NOT NULL,
  "maxAmount" DECIMAL(10,2),
  "monthlyPrice" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LicensePricingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LicenseBillingRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "activeDevices" INTEGER NOT NULL DEFAULT 0,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
  "paidAt" TIMESTAMP(3),
  "markedByUserId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LicenseBillingRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LicensePricingRule_scopeKey_tierKey_key"
  ON "LicensePricingRule"("scopeKey", "tierKey");

CREATE INDEX "LicensePricingRule_scopeUserId_idx"
  ON "LicensePricingRule"("scopeUserId");

CREATE UNIQUE INDEX "LicenseBillingRecord_userId_year_month_key"
  ON "LicenseBillingRecord"("userId", "year", "month");

CREATE INDEX "LicenseBillingRecord_status_year_month_idx"
  ON "LicenseBillingRecord"("status", "year", "month");
