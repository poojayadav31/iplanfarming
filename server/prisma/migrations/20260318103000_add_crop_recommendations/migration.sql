-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "suitableSoilTypes" TEXT[],
    "minPh" DOUBLE PRECISION NOT NULL,
    "maxPh" DOUBLE PRECISION NOT NULL,
    "season" TEXT NOT NULL,
    "estimatedDurationMonths" INTEGER NOT NULL,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Crop_name_key" ON "Crop"("name");
