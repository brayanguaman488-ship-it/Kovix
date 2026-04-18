CREATE TABLE "TrashEntry" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "summary" TEXT,
  "payload" JSONB,
  "deletedByUserId" TEXT,
  "deleteAfter" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrashEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrashEntry_deleteAfter_idx" ON "TrashEntry"("deleteAfter");
CREATE INDEX "TrashEntry_entityType_entityId_idx" ON "TrashEntry"("entityType", "entityId");
