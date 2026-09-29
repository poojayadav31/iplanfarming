-- CreateTable
CREATE TABLE "ZoneCropAssignment" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "cropEconomicsId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoneCropAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZoneCropAssignment_zoneId_key" ON "ZoneCropAssignment"("zoneId");

-- AddForeignKey
ALTER TABLE "ZoneCropAssignment" ADD CONSTRAINT "ZoneCropAssignment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneCropAssignment" ADD CONSTRAINT "ZoneCropAssignment_cropEconomicsId_fkey" FOREIGN KEY ("cropEconomicsId") REFERENCES "CropEconomics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
