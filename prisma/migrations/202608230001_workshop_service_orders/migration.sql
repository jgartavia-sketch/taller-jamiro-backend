CREATE TYPE "WorkshopStatus" AS ENUM ('RECEIVED', 'DIAGNOSIS', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK', 'READY', 'DELIVERED', 'CANCELLED');

CREATE TABLE "Vehicle" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plate" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceOrder" (
  "id" TEXT NOT NULL,
  "orderCode" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "mileage" INTEGER NOT NULL,
  "fuelLevel" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "visibleDamage" TEXT,
  "receivedItems" TEXT,
  "estimatedDelivery" TIMESTAMP(3),
  "status" "WorkshopStatus" NOT NULL DEFAULT 'RECEIVED',
  "deliveredAt" TIMESTAMP(3),
  "createdByStaffId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceUpdate" (
  "id" TEXT NOT NULL,
  "serviceOrderId" TEXT NOT NULL,
  "status" "WorkshopStatus" NOT NULL,
  "note" TEXT NOT NULL,
  "createdByStaffId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceUpdate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServicePhoto" (
  "id" TEXT NOT NULL,
  "serviceOrderId" TEXT NOT NULL,
  "updateId" TEXT,
  "dataUrl" TEXT NOT NULL,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServicePhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Vehicle_userId_plate_key" ON "Vehicle"("userId", "plate");
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");
CREATE UNIQUE INDEX "ServiceOrder_orderCode_key" ON "ServiceOrder"("orderCode");
CREATE INDEX "ServiceOrder_customerId_status_idx" ON "ServiceOrder"("customerId", "status");
CREATE INDEX "ServiceOrder_status_updatedAt_idx" ON "ServiceOrder"("status", "updatedAt");
CREATE INDEX "ServiceUpdate_serviceOrderId_createdAt_idx" ON "ServiceUpdate"("serviceOrderId", "createdAt");
CREATE INDEX "ServicePhoto_serviceOrderId_createdAt_idx" ON "ServicePhoto"("serviceOrderId", "createdAt");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "StaffAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceUpdate" ADD CONSTRAINT "ServiceUpdate_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceUpdate" ADD CONSTRAINT "ServiceUpdate_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "StaffAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePhoto" ADD CONSTRAINT "ServicePhoto_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicePhoto" ADD CONSTRAINT "ServicePhoto_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "ServiceUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;