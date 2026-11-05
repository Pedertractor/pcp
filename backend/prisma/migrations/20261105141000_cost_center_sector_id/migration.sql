-- AlterTable
ALTER TABLE "cost_centers" ALTER COLUMN "sector_id_base_api" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_sector_id_base_api_key" ON "cost_centers"("sector_id_base_api");
