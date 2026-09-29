-- DropIndex
DROP INDEX "CalendarTask_zoneId_taskType_scheduledDate_key";

-- AlterTable
ALTER TABLE "CalendarTask" ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "zoneId" DROP NOT NULL,
ALTER COLUMN "cropName" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "CalendarTask_farmId_isCustom_idx" ON "CalendarTask"("farmId", "isCustom");
