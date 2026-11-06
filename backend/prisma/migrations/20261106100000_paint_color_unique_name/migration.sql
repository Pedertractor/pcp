-- One catalog row per color name. The old unique (name, brand) index
-- does not block duplicates while brand is null.

ALTER TABLE "paint_colors" ADD COLUMN "name_key" TEXT;

UPDATE "paint_colors"
SET "name_key" = lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'))
WHERE "name_key" IS NULL;

WITH ranked AS (
  SELECT
    "id",
    first_value("id") OVER (
      PARTITION BY "name_key"
      ORDER BY "id"
    ) AS "keep_id"
  FROM "paint_colors"
)
UPDATE "production_orders" AS po
SET "color_id" = ranked."keep_id"
FROM ranked
WHERE po."color_id" = ranked."id"
  AND ranked."id" <> ranked."keep_id";

DELETE FROM "paint_colors" AS pc
USING (
  SELECT
    "id",
    first_value("id") OVER (
      PARTITION BY "name_key"
      ORDER BY "id"
    ) AS "keep_id"
  FROM "paint_colors"
) AS ranked
WHERE pc."id" = ranked."id"
  AND ranked."id" <> ranked."keep_id";

ALTER TABLE "paint_colors" ALTER COLUMN "name_key" SET NOT NULL;

DROP INDEX "paint_colors_name_brand_key";

CREATE UNIQUE INDEX "paint_colors_name_key_key" ON "paint_colors"("name_key");
