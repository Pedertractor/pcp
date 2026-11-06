-- One row per production order per planning sync day.

CREATE TABLE "production_order_syncs" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "sync_date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "status_date" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_syncs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_order_syncs_production_order_id_sync_date_key" ON "production_order_syncs"("production_order_id", "sync_date");

CREATE INDEX "production_order_syncs_block_id_sync_date_idx" ON "production_order_syncs"("block_id", "sync_date");

ALTER TABLE "production_order_syncs" ADD CONSTRAINT "production_order_syncs_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_order_syncs" ADD CONSTRAINT "production_order_syncs_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing orders were synced on their target date.
INSERT INTO "production_order_syncs" ("id", "production_order_id", "block_id", "sync_date", "quantity", "status_date", "synced_at")
SELECT gen_random_uuid()::text, "id", "block_id", "target_date", "quantity", "status_date", "updated_at"
FROM "production_orders";
