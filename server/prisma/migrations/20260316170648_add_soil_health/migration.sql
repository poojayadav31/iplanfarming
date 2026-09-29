-- CreateTable
CREATE TABLE "SoilReport" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "soilType" TEXT NOT NULL,
    "drainageSpeed" TEXT NOT NULL,
    "phLevel" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "earthwormCount" INTEGER NOT NULL DEFAULT 3,
    "phScore" DOUBLE PRECISION NOT NULL,
    "drainageScore" DOUBLE PRECISION NOT NULL,
    "soilTypeScore" DOUBLE PRECISION NOT NULL,
    "earthwormScore" DOUBLE PRECISION NOT NULL,
    "soilHealthScore" DOUBLE PRECISION NOT NULL,
    "scoreLabel" TEXT NOT NULL,
    "recommendations" JSONB NOT NULL,
    "improvementTips" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoilReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoilCropReference" (
    "id" TEXT NOT NULL,
    "soilType" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "phMin" DOUBLE PRECISION NOT NULL,
    "phMax" DOUBLE PRECISION NOT NULL,
    "soilFitNotes" TEXT,

    CONSTRAINT "SoilCropReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SoilReport_zoneId_key" ON "SoilReport"("zoneId");

-- AddForeignKey
ALTER TABLE "SoilReport" ADD CONSTRAINT "SoilReport_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
