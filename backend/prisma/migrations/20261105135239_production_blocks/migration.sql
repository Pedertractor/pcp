-- CreateEnum
CREATE TYPE "block_sector" AS ENUM ('PAINT');

-- CreateEnum
CREATE TYPE "production_order_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateTable
CREATE TABLE "block_plan_images" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_plan_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" "block_sector" NOT NULL DEFAULT 'PAINT',
    "block_plan_image_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "cost_center" TEXT NOT NULL,
    "sector_name" TEXT NOT NULL,
    "sector_id_base_api" TEXT,
    "block_id" TEXT NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paint_colors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_color_id" TEXT,
    "brand" TEXT,

    CONSTRAINT "paint_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cost_center" TEXT,
    "position_x" DOUBLE PRECISION,
    "position_y" DOUBLE PRECISION,
    "line_id" TEXT NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "of_number" TEXT NOT NULL,
    "part_code" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "color_id" TEXT,
    "area" TEXT,
    "direction" TEXT,
    "operation" TEXT,
    "cost_center" TEXT,
    "status_date" TEXT,
    "machine_id" TEXT,
    "target_date" TIMESTAMP(3) NOT NULL,
    "status" "production_order_status" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocks_name_key" ON "blocks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_block_plan_image_id_key" ON "blocks"("block_plan_image_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_cost_center_key" ON "cost_centers"("cost_center");

-- CreateIndex
CREATE INDEX "cost_centers_block_id_idx" ON "cost_centers"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "lines_block_id_code_key" ON "lines"("block_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "paint_colors_name_brand_key" ON "paint_colors"("name", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "machines_code_key" ON "machines"("code");

-- CreateIndex
CREATE INDEX "machines_line_id_idx" ON "machines"("line_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_of_number_key" ON "production_orders"("of_number");

-- CreateIndex
CREATE INDEX "production_orders_block_id_idx" ON "production_orders"("block_id");

-- CreateIndex
CREATE INDEX "production_orders_status_idx" ON "production_orders"("status");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_block_plan_image_id_fkey" FOREIGN KEY ("block_plan_image_id") REFERENCES "block_plan_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "paint_colors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
