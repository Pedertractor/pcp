-- An OF is unique within a block; the same OF may exist in another block.

DROP INDEX "production_orders_of_number_key";

CREATE UNIQUE INDEX "production_orders_block_id_of_number_key" ON "production_orders"("block_id", "of_number");
