-- Machines belong to the block directly; "lines" from Excel stay on production_orders.line only.

ALTER TABLE "machines" ADD COLUMN "block_id" TEXT;

UPDATE "machines" AS m
SET "block_id" = l."block_id"
FROM "lines" AS l
WHERE m."line_id" = l."id";

ALTER TABLE "machines" ALTER COLUMN "block_id" SET NOT NULL;

ALTER TABLE "machines" DROP CONSTRAINT "machines_line_id_fkey";

DROP INDEX "machines_line_id_idx";

ALTER TABLE "machines" DROP COLUMN "line_id";

ALTER TABLE "machines"
  ADD CONSTRAINT "machines_block_id_fkey"
  FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "machines_block_id_idx" ON "machines"("block_id");

DROP TABLE "lines";
