-- CreateEnum
CREATE TYPE "line_label_anchor" AS ENUM ('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT');

-- AlterTable
ALTER TABLE "lines" ADD COLUMN "label_anchor" "line_label_anchor" NOT NULL DEFAULT 'TOP_LEFT';
