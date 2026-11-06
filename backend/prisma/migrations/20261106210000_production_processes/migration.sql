-- Processes from consultation 2 (execution), keyed by OF + operation within the order.

CREATE TABLE "production_processes" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "of_number" TEXT NOT NULL,
    "op_number" INTEGER NOT NULL,
    "cost_center" TEXT NOT NULL,
    "planned_at" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "quantity_reported" INTEGER,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "badge_number" INTEGER,
    "component_code" INTEGER,
    "component_quantity" INTEGER,
    "machine_code" TEXT NOT NULL,
    "machine_id" TEXT,
    "color_name" TEXT,
    "color_id" TEXT,
    "area" DOUBLE PRECISION,

    CONSTRAINT "production_processes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_processes_production_order_id_op_number_key" ON "production_processes"("production_order_id", "op_number");

CREATE INDEX "production_processes_block_id_started_at_idx" ON "production_processes"("block_id", "started_at");

CREATE INDEX "production_processes_block_id_finished_at_idx" ON "production_processes"("block_id", "finished_at");

CREATE INDEX "production_processes_machine_id_idx" ON "production_processes"("machine_id");

ALTER TABLE "production_processes" ADD CONSTRAINT "production_processes_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_processes" ADD CONSTRAINT "production_processes_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_processes" ADD CONSTRAINT "production_processes_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_processes" ADD CONSTRAINT "production_processes_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "paint_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
