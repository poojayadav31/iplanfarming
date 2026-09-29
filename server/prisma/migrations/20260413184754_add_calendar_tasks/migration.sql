-- CreateEnum
CREATE TYPE "CalendarTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "CalendarTask" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'morning',
    "labourWorkers" INTEGER NOT NULL DEFAULT 1,
    "labourHours" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "recipeKey" TEXT,
    "weekOffset" INTEGER NOT NULL DEFAULT 0,
    "status" "CalendarTaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarTask_farmId_scheduledDate_idx" ON "CalendarTask"("farmId", "scheduledDate");

-- CreateIndex
CREATE INDEX "CalendarTask_farmId_status_idx" ON "CalendarTask"("farmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarTask_zoneId_taskType_scheduledDate_key" ON "CalendarTask"("zoneId", "taskType", "scheduledDate");

-- AddForeignKey
ALTER TABLE "CalendarTask" ADD CONSTRAINT "CalendarTask_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarTask" ADD CONSTRAINT "CalendarTask_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
