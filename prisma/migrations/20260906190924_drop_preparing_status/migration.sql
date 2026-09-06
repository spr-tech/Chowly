-- Drop the PREPARING value from OrderStatus. Postgres has no ALTER TYPE ...
-- DROP VALUE, so recreate the enum without it and repoint the column.
-- Safe against an empty table: no Order rows exist yet in this database.
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'SERVED', 'PAID');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PLACED';
DROP TYPE "OrderStatus_old";
