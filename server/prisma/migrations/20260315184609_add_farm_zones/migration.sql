-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundary" JSONB NOT NULL,
    "centroid" JSONB NOT NULL,
    "areaSquareMeters" DOUBLE PRECISION NOT NULL,
    "areaBigha" DOUBLE PRECISION NOT NULL,
    "areaAcres" DOUBLE PRECISION NOT NULL,
    "areaHectares" DOUBLE PRECISION NOT NULL,
    "perimeter" DOUBLE PRECISION NOT NULL,
    "convexityScore" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Chhattisgarh',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneNumber" INTEGER NOT NULL,
    "boundary" JSONB NOT NULL,
    "centroid" JSONB NOT NULL,
    "areaSquareMeters" DOUBLE PRECISION NOT NULL,
    "areaBigha" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
