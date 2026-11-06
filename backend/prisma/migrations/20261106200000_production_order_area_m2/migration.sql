-- AREA is the area of one piece in m²; store it as a number.

ALTER TABLE "production_orders"
ALTER COLUMN "area" TYPE DOUBLE PRECISION
USING ROUND(NULLIF(REPLACE(TRIM("area"), ',', '.'), '')::numeric, 4)::double precision;
