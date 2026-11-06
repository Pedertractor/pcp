-- Replace the per-day sync table with a single sync date on the production order.

DROP TABLE "production_order_syncs";

-- Only OFs classified as HOJE or NO ATRASO are kept (STATUS_DATA comes prefixed with dots).
DELETE FROM "production_orders"
WHERE UPPER(LTRIM(COALESCE("status_date", ''), '. ')) NOT IN ('HOJE', 'NO ATRASO');

ALTER TABLE "production_orders" ADD COLUMN "sync_date" TIMESTAMP(3);

UPDATE "production_orders" SET "sync_date" = "target_date";

ALTER TABLE "production_orders" ALTER COLUMN "sync_date" SET NOT NULL;
