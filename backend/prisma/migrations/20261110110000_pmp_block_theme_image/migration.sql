-- Imagem temática por bloco PMP (fundo transparente)

CREATE TABLE "pmp_block_theme_images" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pmp_block_theme_images_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pmp_blocks" ADD COLUMN "theme_image_id" TEXT;

CREATE UNIQUE INDEX "pmp_blocks_theme_image_id_key" ON "pmp_blocks"("theme_image_id");

ALTER TABLE "pmp_blocks" ADD CONSTRAINT "pmp_blocks_theme_image_id_fkey" FOREIGN KEY ("theme_image_id") REFERENCES "pmp_block_theme_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
