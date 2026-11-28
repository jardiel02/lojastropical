-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "products_status_position_idx" ON "products"("status", "position");
