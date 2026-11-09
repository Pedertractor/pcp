-- Linhas de produção no bloco (área no mapa + máquinas vinculadas).

CREATE TABLE "lines" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "position_x" DOUBLE PRECISION,
    "position_y" DOUBLE PRECISION,
    "position_width" DOUBLE PRECISION,
    "position_height" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lines_block_id_code_key" ON "lines"("block_id", "code");
CREATE INDEX "lines_block_id_idx" ON "lines"("block_id");

ALTER TABLE "lines" ADD CONSTRAINT "lines_block_id_fkey"
    FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "machines" ADD COLUMN "line_id" TEXT;

CREATE INDEX "machines_line_id_idx" ON "machines"("line_id");

ALTER TABLE "machines" ADD CONSTRAINT "machines_line_id_fkey"
    FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
