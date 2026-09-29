/*
  Warnings:

  - A unique constraint covering the columns `[zoneId,taskType,scheduledDate]` on the table `CalendarTask` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SupplyStatus" AS ENUM ('UPCOMING', 'AVAILABLE', 'PARTIALLY_SOLD', 'SOLD_OUT', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProduceForm" AS ENUM ('RAW', 'PROCESSED');

-- CreateEnum
CREATE TYPE "ProduceGrade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK_TRANSFER', 'UPI');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('FARMER', 'CUSTOMER');

-- DropIndex
DROP INDEX "CalendarTask_farmId_status_idx";

-- AlterTable
ALTER TABLE "Crop" ADD COLUMN     "cropFamily" TEXT NOT NULL DEFAULT 'Other',
ADD COLUMN     "maxTempC" DOUBLE PRECISION NOT NULL DEFAULT 45,
ADD COLUMN     "minSoilHealthScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minTempC" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "plantingWindowEnd" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "plantingWindowStart" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "preferredDrainage" TEXT NOT NULL DEFAULT 'Any',
ADD COLUMN     "rainfallTolerance" TEXT NOT NULL DEFAULT 'moderate',
ADD COLUMN     "riskLevel" TEXT NOT NULL DEFAULT 'intermediate',
ADD COLUMN     "seasonDurationWeeks" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "seedKgPerAcre" DOUBLE PRECISION NOT NULL DEFAULT 20,
ADD COLUMN     "spacingNotes" TEXT;

-- AlterTable
ALTER TABLE "Expert" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "regionDistricts" TEXT[],
ADD COLUMN     "specialization" TEXT;

-- AlterTable
ALTER TABLE "FarmFinancials" ADD COLUMN     "labourRatePerHour" DOUBLE PRECISION,
ALTER COLUMN "landLayoutCost" DROP NOT NULL,
ALTER COLUMN "landLayoutCost" DROP DEFAULT,
ALTER COLUMN "dripIrrigationCost" DROP NOT NULL,
ALTER COLUMN "dripIrrigationCost" DROP DEFAULT,
ALTER COLUMN "solarDryerCost" DROP NOT NULL,
ALTER COLUMN "solarDryerCost" DROP DEFAULT,
ALTER COLUMN "annualLabourCost" DROP NOT NULL,
ALTER COLUMN "annualLabourCost" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Farmer" ADD COLUMN     "experienceLevel" TEXT NOT NULL DEFAULT 'New',
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ZoneCropAssignment" ADD COLUMN     "varietyName" TEXT;

-- CreateTable
CREATE TABLE "ExpertAdvisory" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "farmId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "season" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertAdvisory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertCropSuggestion" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "farmerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertCropSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneCropHistory" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoneCropHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "zoneId" TEXT,
    "calendarTaskId" TEXT,
    "cropName" TEXT NOT NULL,
    "predictedHarvestDate" DATE NOT NULL,
    "estimatedQuantityKg" DOUBLE PRECISION NOT NULL,
    "availableQuantityKg" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "minOrderKg" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "grade" "ProduceGrade" NOT NULL DEFAULT 'A',
    "form" "ProduceForm" NOT NULL DEFAULT 'RAW',
    "status" "SupplyStatus" NOT NULL DEFAULT 'UPCOMING',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Chhattisgarh',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demand" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "maxPricePerKg" DOUBLE PRECISION,
    "neededByDate" DATE NOT NULL,
    "preferredDistrict" TEXT,
    "preferredState" TEXT NOT NULL DEFAULT 'Chhattisgarh',
    "form" "ProduceForm" NOT NULL DEFAULT 'RAW',
    "status" "DemandStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "demandId" TEXT,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryAddress" TEXT NOT NULL,
    "farmerNote" TEXT,
    "customerNote" TEXT,
    "cancelledBy" "CancelledBy",
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandMatch" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropLifecycleTemplate" (
    "id" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "weekOffset" INTEGER NOT NULL,
    "taskType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'morning',
    "workers" INTEGER NOT NULL DEFAULT 2,
    "hoursPerAcre" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "recipeKey" TEXT,
    "isObservation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropLifecycleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmIssue" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "zoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "symptom" TEXT,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerQuestion" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answeredBy" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmPhoto" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "caption" TEXT,
    "weekIntoSeason" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestRecord" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "varietyName" TEXT,
    "yieldKg" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION,
    "totalRevenue" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "netProfit" DOUBLE PRECISION,
    "notes" TEXT,
    "harvestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HarvestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropPairing" (
    "id" TEXT NOT NULL,
    "primaryCrop" TEXT NOT NULL,
    "companionCrop" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "rowRatio" TEXT,
    "spacingNotes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ZBNF',

    CONSTRAINT "CropPairing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverCrop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "nitrogenFixedKgPerAcre" DOUBLE PRECISION NOT NULL,
    "bestForSeason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "preparationNotes" TEXT,

    CONSTRAINT "CoverCrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropVariety" (
    "id" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "varietyName" TEXT NOT NULL,
    "recommendedFor" TEXT[],
    "yieldPotential" DOUBLE PRECISION,
    "durationDays" INTEGER,
    "pestResistance" TEXT,
    "notes" TEXT,

    CONSTRAINT "CropVariety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandiPrice" (
    "id" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "pricePerQuintal" DOUBLE PRECISION NOT NULL,
    "msp" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "MandiPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovScheme" (
    "id" TEXT NOT NULL,
    "schemeName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "benefitSummary" TEXT NOT NULL,
    "eligibilityNotes" TEXT NOT NULL,
    "applyUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GovScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PestAlert" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "cropName" TEXT,
    "pestName" TEXT NOT NULL,
    "reportCount" INTEGER NOT NULL,
    "lastReportedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PestAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckIn" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "pestSeen" BOOLEAN NOT NULL DEFAULT false,
    "leavesHealthy" BOOLEAN NOT NULL DEFAULT true,
    "soilMoist" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonGoal" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "targetRevenue" DOUBLE PRECISION NOT NULL,
    "targetYieldKg" DOUBLE PRECISION,
    "feasibilityScore" INTEGER,
    "feasibilityNotes" TEXT,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "sourceQuestionId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyGroup" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "totalQuantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION,
    "organiserFarmerId" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentListing" (
    "id" TEXT NOT NULL,
    "ownerFarmerId" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION,
    "dailyRate" DOUBLE PRECISION,
    "contactPhone" TEXT,
    "notes" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreSeasonTask" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "zoneId" TEXT,
    "cropName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreSeasonTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoilReportSnapshot" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "soilType" TEXT NOT NULL,
    "drainageSpeed" TEXT NOT NULL,
    "phLevel" DOUBLE PRECISION NOT NULL,
    "earthwormCount" INTEGER NOT NULL,
    "soilHealthScore" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoilReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorderCrop" (
    "id" TEXT NOT NULL,
    "primaryCrop" TEXT NOT NULL,
    "borderCrop" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "BorderCrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SowingBatch" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "cropName" TEXT NOT NULL,
    "plannedSowDate" TIMESTAMP(3) NOT NULL,
    "actualSowDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SowingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomSuggestion" (
    "id" TEXT NOT NULL,
    "symptom" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SymptomSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicsConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "landLayoutCostPerAcre" DOUBLE PRECISION NOT NULL DEFAULT 12500,
    "dripIrrigationCostPerAcre" DOUBLE PRECISION NOT NULL DEFAULT 40000,
    "solarDryerCostFlat" DOUBLE PRECISION NOT NULL DEFAULT 13500,
    "annualLabourCost" DOUBLE PRECISION NOT NULL DEFAULT 576000,
    "labourRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "jeevamritHomemade" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomicsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmDesign" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Farm Layout',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "gridSizeMeters" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "designData" JSONB NOT NULL,
    "previewImage" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZoneCropHistory_zoneId_endedAt_idx" ON "ZoneCropHistory"("zoneId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supply_calendarTaskId_key" ON "Supply"("calendarTaskId");

-- CreateIndex
CREATE INDEX "Supply_cropName_status_district_idx" ON "Supply"("cropName", "status", "district");

-- CreateIndex
CREATE INDEX "Supply_farmId_status_idx" ON "Supply"("farmId", "status");

-- CreateIndex
CREATE INDEX "Supply_predictedHarvestDate_idx" ON "Supply"("predictedHarvestDate");

-- CreateIndex
CREATE INDEX "Demand_cropName_status_idx" ON "Demand"("cropName", "status");

-- CreateIndex
CREATE INDEX "Demand_customerId_idx" ON "Demand"("customerId");

-- CreateIndex
CREATE INDEX "Order_farmerId_status_idx" ON "Order"("farmerId", "status");

-- CreateIndex
CREATE INDEX "Order_customerId_status_idx" ON "Order"("customerId", "status");

-- CreateIndex
CREATE INDEX "Order_supplyId_idx" ON "Order"("supplyId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandMatch_supplyId_demandId_key" ON "DemandMatch"("supplyId", "demandId");

-- CreateIndex
CREATE INDEX "CropLifecycleTemplate_cropName_idx" ON "CropLifecycleTemplate"("cropName");

-- CreateIndex
CREATE INDEX "FarmIssue_farmerId_status_idx" ON "FarmIssue"("farmerId", "status");

-- CreateIndex
CREATE INDEX "FarmerQuestion_farmerId_createdAt_idx" ON "FarmerQuestion"("farmerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_farmerId_badgeKey_key" ON "Achievement"("farmerId", "badgeKey");

-- CreateIndex
CREATE INDEX "FarmPhoto_zoneId_createdAt_idx" ON "FarmPhoto"("zoneId", "createdAt");

-- CreateIndex
CREATE INDEX "HarvestRecord_zoneId_harvestedAt_idx" ON "HarvestRecord"("zoneId", "harvestedAt");

-- CreateIndex
CREATE INDEX "HarvestRecord_farmId_cropName_idx" ON "HarvestRecord"("farmId", "cropName");

-- CreateIndex
CREATE INDEX "CropPairing_primaryCrop_idx" ON "CropPairing"("primaryCrop");

-- CreateIndex
CREATE UNIQUE INDEX "CoverCrop_name_key" ON "CoverCrop"("name");

-- CreateIndex
CREATE INDEX "CropVariety_cropName_idx" ON "CropVariety"("cropName");

-- CreateIndex
CREATE INDEX "MandiPrice_cropName_district_recordedAt_idx" ON "MandiPrice"("cropName", "district", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovScheme_schemeName_key" ON "GovScheme"("schemeName");

-- CreateIndex
CREATE INDEX "PestAlert_district_isActive_idx" ON "PestAlert"("district", "isActive");

-- CreateIndex
CREATE INDEX "DailyCheckIn_zoneId_createdAt_idx" ON "DailyCheckIn"("zoneId", "createdAt");

-- CreateIndex
CREATE INDEX "SeasonGoal_farmerId_season_idx" ON "SeasonGoal"("farmerId", "season");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_category_idx" ON "KnowledgeArticle"("category");

-- CreateIndex
CREATE INDEX "BuyGroup_district_status_idx" ON "BuyGroup"("district", "status");

-- CreateIndex
CREATE INDEX "EquipmentListing_district_equipmentType_idx" ON "EquipmentListing"("district", "equipmentType");

-- CreateIndex
CREATE INDEX "PreSeasonTask_farmerId_dueDate_idx" ON "PreSeasonTask"("farmerId", "dueDate");

-- CreateIndex
CREATE INDEX "SoilReportSnapshot_zoneId_recordedAt_idx" ON "SoilReportSnapshot"("zoneId", "recordedAt");

-- CreateIndex
CREATE INDEX "BorderCrop_primaryCrop_idx" ON "BorderCrop"("primaryCrop");

-- CreateIndex
CREATE INDEX "SowingBatch_zoneId_plannedSowDate_idx" ON "SowingBatch"("zoneId", "plannedSowDate");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomSuggestion_symptom_key" ON "SymptomSuggestion"("symptom");

-- CreateIndex
CREATE INDEX "FarmDesign_farmId_status_idx" ON "FarmDesign"("farmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarTask_zoneId_taskType_scheduledDate_key" ON "CalendarTask"("zoneId", "taskType", "scheduledDate");

-- AddForeignKey
ALTER TABLE "ExpertAdvisory" ADD CONSTRAINT "ExpertAdvisory_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertAdvisory" ADD CONSTRAINT "ExpertAdvisory_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertCropSuggestion" ADD CONSTRAINT "ExpertCropSuggestion_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertCropSuggestion" ADD CONSTRAINT "ExpertCropSuggestion_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertCropSuggestion" ADD CONSTRAINT "ExpertCropSuggestion_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_calendarTaskId_fkey" FOREIGN KEY ("calendarTaskId") REFERENCES "CalendarTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandMatch" ADD CONSTRAINT "DemandMatch_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandMatch" ADD CONSTRAINT "DemandMatch_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmIssue" ADD CONSTRAINT "FarmIssue_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerQuestion" ADD CONSTRAINT "FarmerQuestion_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyGroup" ADD CONSTRAINT "BuyGroup_organiserFarmerId_fkey" FOREIGN KEY ("organiserFarmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmDesign" ADD CONSTRAINT "FarmDesign_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
