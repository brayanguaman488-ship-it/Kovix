CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

CREATE TABLE "DeletionRequest" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "summary" TEXT,
  "observation" TEXT NOT NULL,
  "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
  "requestedByUserId" TEXT,
  "resolvedByUserId" TEXT,
  "resolutionNotes" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeletionRequest_status_createdAt_idx" ON "DeletionRequest"("status", "createdAt");
CREATE INDEX "DeletionRequest_entityType_entityId_idx" ON "DeletionRequest"("entityType", "entityId");

ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
