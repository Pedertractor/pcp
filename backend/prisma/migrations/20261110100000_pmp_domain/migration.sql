-- PMP: blocos, centros de custo, operações, metas e antecipações

CREATE TABLE "pmp_blocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pmp_blocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pmp_blocks_name_key" ON "pmp_blocks"("name");

CREATE TABLE "pmp_cost_centers" (
    "id" TEXT NOT NULL,
    "pmp_block_id" TEXT NOT NULL,
    "cost_center" TEXT NOT NULL,
    "sector_name" TEXT,
    "sector_id_api" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pmp_cost_centers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pmp_cost_centers_pmp_block_id_cost_center_key" ON "pmp_cost_centers"("pmp_block_id", "cost_center");
CREATE UNIQUE INDEX "pmp_cost_centers_pmp_block_id_sector_id_api_key" ON "pmp_cost_centers"("pmp_block_id", "sector_id_api");
CREATE INDEX "pmp_cost_centers_pmp_block_id_idx" ON "pmp_cost_centers"("pmp_block_id");

CREATE TABLE "pmp_cost_center_operations" (
    "id" TEXT NOT NULL,
    "pmp_cost_center_id" TEXT NOT NULL,
    "operation" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pmp_cost_center_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pmp_cost_center_operations_pmp_cost_center_id_operation_key" ON "pmp_cost_center_operations"("pmp_cost_center_id", "operation");
CREATE INDEX "pmp_cost_center_operations_pmp_cost_center_id_idx" ON "pmp_cost_center_operations"("pmp_cost_center_id");

CREATE TABLE "production_weekly_goals" (
    "id" TEXT NOT NULL,
    "pmp_block_id" TEXT NOT NULL,
    "pmp_cost_center_operation_id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT,
    "week_start" DATE NOT NULL,
    "week_end" DATE NOT NULL,
    "planned_quantity" INTEGER NOT NULL,
    "produced_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_weekly_goals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_weekly_goals_pmp_block_id_product_code_pmp_cost_center_operation_id_week_start_key" ON "production_weekly_goals"("pmp_block_id", "product_code", "pmp_cost_center_operation_id", "week_start");
CREATE INDEX "production_weekly_goals_week_start_pmp_cost_center_operation_id_idx" ON "production_weekly_goals"("week_start", "pmp_cost_center_operation_id");
CREATE INDEX "production_weekly_goals_pmp_block_id_week_start_idx" ON "production_weekly_goals"("pmp_block_id", "week_start");

CREATE TABLE "production_daily_goals" (
    "id" TEXT NOT NULL,
    "weekly_goal_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "planned_quantity" INTEGER NOT NULL,
    "produced_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_daily_goals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_daily_goals_weekly_goal_id_date_key" ON "production_daily_goals"("weekly_goal_id", "date");
CREATE INDEX "production_daily_goals_date_idx" ON "production_daily_goals"("date");

CREATE TABLE "production_daily_goal_orders" (
    "id" TEXT NOT NULL,
    "daily_goal_id" TEXT NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "operation" INTEGER NOT NULL,
    "allocated_quantity" INTEGER NOT NULL,
    "produced_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_daily_goal_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_daily_goal_orders_daily_goal_id_external_order_id_operation_key" ON "production_daily_goal_orders"("daily_goal_id", "external_order_id", "operation");
CREATE INDEX "production_daily_goal_orders_external_order_id_operation_idx" ON "production_daily_goal_orders"("external_order_id", "operation");

CREATE TABLE "production_goal_loans" (
    "id" TEXT NOT NULL,
    "source_daily_goal_id" TEXT NOT NULL,
    "target_daily_goal_id" TEXT NOT NULL,
    "source_order_id" TEXT NOT NULL,
    "borrowed_quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_goal_loans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "production_goal_loans_source_daily_goal_id_idx" ON "production_goal_loans"("source_daily_goal_id");
CREATE INDEX "production_goal_loans_target_daily_goal_id_idx" ON "production_goal_loans"("target_daily_goal_id");
CREATE INDEX "production_goal_loans_source_order_id_idx" ON "production_goal_loans"("source_order_id");

ALTER TABLE "pmp_cost_centers" ADD CONSTRAINT "pmp_cost_centers_pmp_block_id_fkey" FOREIGN KEY ("pmp_block_id") REFERENCES "pmp_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmp_cost_center_operations" ADD CONSTRAINT "pmp_cost_center_operations_pmp_cost_center_id_fkey" FOREIGN KEY ("pmp_cost_center_id") REFERENCES "pmp_cost_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_weekly_goals" ADD CONSTRAINT "production_weekly_goals_pmp_block_id_fkey" FOREIGN KEY ("pmp_block_id") REFERENCES "pmp_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_weekly_goals" ADD CONSTRAINT "production_weekly_goals_pmp_cost_center_operation_id_fkey" FOREIGN KEY ("pmp_cost_center_operation_id") REFERENCES "pmp_cost_center_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_daily_goals" ADD CONSTRAINT "production_daily_goals_weekly_goal_id_fkey" FOREIGN KEY ("weekly_goal_id") REFERENCES "production_weekly_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_daily_goal_orders" ADD CONSTRAINT "production_daily_goal_orders_daily_goal_id_fkey" FOREIGN KEY ("daily_goal_id") REFERENCES "production_daily_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_goal_loans" ADD CONSTRAINT "production_goal_loans_source_daily_goal_id_fkey" FOREIGN KEY ("source_daily_goal_id") REFERENCES "production_daily_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_goal_loans" ADD CONSTRAINT "production_goal_loans_target_daily_goal_id_fkey" FOREIGN KEY ("target_daily_goal_id") REFERENCES "production_daily_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
