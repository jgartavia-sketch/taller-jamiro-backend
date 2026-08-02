CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "ServiceRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "problem" TEXT NOT NULL,
  "preferredDate" TIMESTAMP(3),
  "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceRequest_status_createdAt_idx" ON "ServiceRequest"("status", "createdAt");