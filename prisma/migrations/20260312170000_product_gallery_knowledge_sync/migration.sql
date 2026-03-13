CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "discount_percent" INTEGER NOT NULL DEFAULT 0,
    "product_url" TEXT NOT NULL,
    "structured_output" JSONB NOT NULL,
    "knowledge_document_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_client_id_slug_key" ON "products"("client_id", "slug");
CREATE UNIQUE INDEX "products_knowledge_document_id_key" ON "products"("knowledge_document_id");
CREATE INDEX "products_client_id_created_at_idx" ON "products"("client_id", "created_at");
CREATE UNIQUE INDEX "product_images_product_id_file_asset_id_key" ON "product_images"("product_id", "file_asset_id");
CREATE INDEX "product_images_product_id_sort_order_idx" ON "product_images"("product_id", "sort_order");
CREATE INDEX "product_images_file_asset_id_idx" ON "product_images"("file_asset_id");

ALTER TABLE "products"
ADD CONSTRAINT "products_client_id_fkey"
FOREIGN KEY ("client_id") REFERENCES "clients"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
ADD CONSTRAINT "products_knowledge_document_id_fkey"
FOREIGN KEY ("knowledge_document_id") REFERENCES "documents"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_file_asset_id_fkey"
FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
