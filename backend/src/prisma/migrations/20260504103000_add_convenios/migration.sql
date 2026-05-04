CREATE TABLE "ConvenioAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "grantedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConvenioAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConvenioCustomer" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "nationalId" TEXT NOT NULL,
  "phone" TEXT,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConvenioCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConvenioDevice" (
  "id" TEXT NOT NULL,
  "convenioCustomerId" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "imei" TEXT,
  "cashPrice" DECIMAL(10,2),
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConvenioDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConvenioPayment" (
  "id" TEXT NOT NULL,
  "convenioCustomerId" TEXT NOT NULL,
  "convenioDeviceId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
  "notes" TEXT,
  "createdByUserId" TEXT,
  "collectedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConvenioPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConvenioAccess_userId_key" ON "ConvenioAccess"("userId");
CREATE INDEX "ConvenioAccess_enabled_idx" ON "ConvenioAccess"("enabled");

CREATE UNIQUE INDEX "ConvenioCustomer_nationalId_createdByUserId_key"
  ON "ConvenioCustomer"("nationalId", "createdByUserId");
CREATE INDEX "ConvenioCustomer_createdByUserId_idx" ON "ConvenioCustomer"("createdByUserId");
CREATE INDEX "ConvenioCustomer_nationalId_idx" ON "ConvenioCustomer"("nationalId");

CREATE UNIQUE INDEX "ConvenioDevice_imei_key" ON "ConvenioDevice"("imei");
CREATE INDEX "ConvenioDevice_convenioCustomerId_idx" ON "ConvenioDevice"("convenioCustomerId");
CREATE INDEX "ConvenioDevice_createdByUserId_idx" ON "ConvenioDevice"("createdByUserId");

CREATE INDEX "ConvenioPayment_convenioCustomerId_dueDate_idx"
  ON "ConvenioPayment"("convenioCustomerId", "dueDate");
CREATE INDEX "ConvenioPayment_convenioDeviceId_idx" ON "ConvenioPayment"("convenioDeviceId");
CREATE INDEX "ConvenioPayment_createdByUserId_dueDate_idx"
  ON "ConvenioPayment"("createdByUserId", "dueDate");
CREATE INDEX "ConvenioPayment_status_dueDate_idx" ON "ConvenioPayment"("status", "dueDate");

ALTER TABLE "ConvenioDevice"
  ADD CONSTRAINT "ConvenioDevice_convenioCustomerId_fkey"
  FOREIGN KEY ("convenioCustomerId") REFERENCES "ConvenioCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConvenioPayment"
  ADD CONSTRAINT "ConvenioPayment_convenioCustomerId_fkey"
  FOREIGN KEY ("convenioCustomerId") REFERENCES "ConvenioCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConvenioPayment"
  ADD CONSTRAINT "ConvenioPayment_convenioDeviceId_fkey"
  FOREIGN KEY ("convenioDeviceId") REFERENCES "ConvenioDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
