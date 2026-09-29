-- CreateEnum
CREATE TYPE "WaterSourceType" AS ENUM ('POND', 'BOREWELL', 'CANAL', 'TANK', 'RIVER');

-- CreateEnum
CREATE TYPE "IrrigationStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- AlterTable: add water requirement to Crop
ALTER TABLE "Crop" ADD COLUMN "weeklyWaterRequirementLitersPerAcre" DOUBLE PRECISION NOT NULL DEFAULT 5000;

-- CreateTable: WaterSource
CREATE TABLE "WaterSource" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" "WaterSourceType" NOT NULL,
    "totalCapacityLiters" DOUBLE PRECISION NOT NULL,
    "currentLevelLiters" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IrrigationSchedule
CREATE TABLE "IrrigationSchedule" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "waterSourceId" TEXT,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "areaAcres" DOUBLE PRECISION NOT NULL,
    "soilRetentionMultiplier" DOUBLE PRECISION NOT NULL,
    "baseWaterLiters" DOUBLE PRECISION NOT NULL,
    "adjustedWaterLiters" DOUBLE PRECISION NOT NULL,
    "irrigationMethod" TEXT NOT NULL,
    "status" "IrrigationStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedLiters" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IrrigationSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: WaterSource → Farm
ALTER TABLE "WaterSource" ADD CONSTRAINT "WaterSource_farmId_fkey"
  FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: IrrigationSchedule → Zone
ALTER TABLE "IrrigationSchedule" ADD CONSTRAINT "IrrigationSchedule_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: IrrigationSchedule → Crop
ALTER TABLE "IrrigationSchedule" ADD CONSTRAINT "IrrigationSchedule_cropId_fkey"
  FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: IrrigationSchedule → WaterSource (nullable)
ALTER TABLE "IrrigationSchedule" ADD CONSTRAINT "IrrigationSchedule_waterSourceId_fkey"
  FOREIGN KEY ("waterSourceId") REFERENCES "WaterSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
