-- CreateEnum
DO $$ BEGIN CREATE TYPE "UsedPartRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'QUOTED', 'CLOSED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UsedPartRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "details" TEXT,
    "status" "UsedPartRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsedPartRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UsedPartRequest_status_createdAt_idx" ON "UsedPartRequest"("status", "createdAt");
