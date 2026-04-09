-- AlterTable
ALTER TABLE "Device"
ADD COLUMN "pushToken" TEXT,
ADD COLUMN "pushTokenUpdatedAt" TIMESTAMP(3);
