-- DropIndex
DROP INDEX "ProcessingRecord_projectId_irHash_key";

-- AlterTable
ALTER TABLE "ProcessingRecord" ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'MZ_FRAGMENTS';

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingRecord_projectId_irHash_stage_key" ON "ProcessingRecord"("projectId", "irHash", "stage");

ALTER TABLE "ProcessingRecord" ADD CHECK (stage IN ('IR','MZ_FRAGMENTS'));
