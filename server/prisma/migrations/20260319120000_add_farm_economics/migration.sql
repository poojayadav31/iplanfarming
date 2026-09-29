-- CreateTable: CropEconomics
-- Stores per-acre yield and pricing data for the multilayer natural farming model.
CREATE TABLE "CropEconomics" (
    "id"                      TEXT NOT NULL,
    "cropName"                TEXT NOT NULL,
    "season"                  TEXT NOT NULL,
    "durationMonths"          INTEGER NOT NULL,
    "yieldPerAcreKg"          DOUBLE PRECISION NOT NULL,
    "rawSalePricePerKg"       DOUBLE PRECISION NOT NULL,
    "processedSalePricePerKg" DOUBLE PRECISION NOT NULL,
    "processingCostPerKg"     DOUBLE PRECISION NOT NULL,
    "seedCostPerAcre"         DOUBLE PRECISION NOT NULL,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropEconomics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FarmFinancials
-- Stores per-farm infrastructure costs and overhead configuration (one record per farm).
CREATE TABLE "FarmFinancials" (
    "id"                 TEXT NOT NULL,
    "farmId"             TEXT NOT NULL,
    "landLayoutCost"     DOUBLE PRECISION NOT NULL DEFAULT 12500,
    "dripIrrigationCost" DOUBLE PRECISION NOT NULL DEFAULT 40000,
    "solarDryerCost"     DOUBLE PRECISION NOT NULL DEFAULT 13500,
    "annualLabourCost"   DOUBLE PRECISION NOT NULL DEFAULT 500000,
    "jeevamritHomemade"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmFinancials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique crop name
CREATE UNIQUE INDEX "CropEconomics_cropName_key" ON "CropEconomics"("cropName");

-- CreateIndex: one FarmFinancials record per farm
CREATE UNIQUE INDEX "FarmFinancials_farmId_key" ON "FarmFinancials"("farmId");

-- AddForeignKey: FarmFinancials → Farm (cascade delete when farm is deleted)
ALTER TABLE "FarmFinancials" ADD CONSTRAINT "FarmFinancials_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
