"use client";

import { useState } from "react";

import AddToCartButton from "./add-to-cart-button";
import ProductImageGallery from "./product-image-gallery";

type ProductImage = { id: string; url: string; alt: string | null; position: number; variantId: string | null };
type ProductVariant = {
  id: string;
  sku: string;
  price: number;
  availableStock: number;
  attributes: { value: string; attribute: { name: string } }[];
  optionValues: { name: string; value: string }[];
  images: ProductImage[];
};

export default function ProductDetailClient({
  product,
}: {
  product: {
    id: string;
    name: string;
    brand: string | null;
    model: string | null;
    description: string | null;
    category: { name: string };
    images: ProductImage[];
    variants: ProductVariant[];
  };
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const generalImages = product.images.filter((image) => image.variantId === null);
  const cartImage = generalImages[0]?.url ?? null;

  return (
    <div className="grid gap-8 rounded-xl border border-brand-border bg-white p-6 md:grid-cols-2">
      <ProductImageGallery
        key={selectedVariantId ?? "no-selected-variant"}
        images={product.images}
        productName={product.name}
        selectedVariantId={selectedVariantId}
      />

      <div>
        <p className="text-sm text-brand-text-subtle">{product.category.name}</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-ink">{product.name}</h1>
        {(product.brand || product.model) && <p className="mt-2 text-brand-text-subtle">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>}
        {product.description && <p className="mt-6 leading-7 text-brand-muted">{product.description}</p>}
        {product.variants.length > 0 && <AddToCartButton
          productId={product.id}
          name={product.name}
          image={cartImage}
          onSelectedVariantChange={setSelectedVariantId}
          variants={product.variants.map((variant) => ({
            ...variant,
            image: variant.images[0]?.url ?? cartImage,
          }))}
        />}
      </div>
    </div>
  );
}
