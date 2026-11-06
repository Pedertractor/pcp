-- Map color (hex) linked per block for each catalog color.

CREATE TABLE "block_paint_colors" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "color_id" TEXT NOT NULL,
    "map_hex" TEXT NOT NULL,

    CONSTRAINT "block_paint_colors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "block_paint_colors_block_id_color_id_key" ON "block_paint_colors"("block_id", "color_id");

CREATE INDEX "block_paint_colors_color_id_idx" ON "block_paint_colors"("color_id");

ALTER TABLE "block_paint_colors" ADD CONSTRAINT "block_paint_colors_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "block_paint_colors" ADD CONSTRAINT "block_paint_colors_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "paint_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
