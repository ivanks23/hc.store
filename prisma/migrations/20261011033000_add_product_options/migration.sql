CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VariantOptionValue" (
    "variantId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    CONSTRAINT "VariantOptionValue_pkey" PRIMARY KEY ("variantId", "valueId")
);

CREATE UNIQUE INDEX "ProductOption_productId_slug_key" ON "ProductOption"("productId", "slug");
CREATE INDEX "ProductOption_productId_position_idx" ON "ProductOption"("productId", "position");
CREATE UNIQUE INDEX "ProductOptionValue_optionId_slug_key" ON "ProductOptionValue"("optionId", "slug");
CREATE INDEX "ProductOptionValue_optionId_position_idx" ON "ProductOptionValue"("optionId", "position");
CREATE INDEX "VariantOptionValue_valueId_idx" ON "VariantOptionValue"("valueId");

ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantOptionValue" ADD CONSTRAINT "VariantOptionValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "ProductOptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
