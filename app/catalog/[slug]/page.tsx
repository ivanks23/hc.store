import Link from "next/link";
import AddToCartButton from "./add-to-cart-button";

import { getVariantStocks } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

type ProductAttribute = {
  value: string;
  attribute: {
    name: string;
  };
};

type VariantOptionValue = {
  value: { value: string; option: { name: string } };
};

type ProductVariant = {
  id: string;
  sku: string;
  price: string;
  availableStock: number;
  attributes: ProductAttribute[];
  optionValues: VariantOptionValue[];
};

type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
};

type Product = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  slug: string;
  category: {
    name: string;
  };
  variants: ProductVariant[];
  images: ProductImage[];
};

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getProduct(slug: string): Promise<Product | null> {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      description: true,
      slug: true,
      category: { select: { name: true } },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          price: true,
          attributes: {
            select: {
              value: true,
              attribute: { select: { name: true } },
            },
          },
          optionValues: {
            select: { value: { select: { value: true, option: { select: { name: true } } } } },
          },
        },
        orderBy: { sku: "asc" },
      },
      images: {
        select: { id: true, url: true, alt: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!product) return null;

  const stocks = await getVariantStocks(
    product.variants.map((variant) => variant.id),
  );

  return {
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      price: variant.price.toFixed(2),
      availableStock: stocks.get(variant.id) ?? 0,
    })),
  };
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return (
      <main className="min-h-screen bg-brand-background px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-brand-border bg-white p-10 text-center">
          <h1 className="text-2xl font-bold text-brand-ink">
            Producto no encontrado
          </h1>

          <Link
            href="/catalog"
            className="mt-6 inline-block rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-white"
          >
            Volver al catálogo
          </Link>
        </div>
      </main>
    );
  }

  const mainImage = product.images[0];

  return (
    <main className="min-h-screen bg-brand-background px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/catalog"
          className="mb-6 inline-block text-sm text-brand-muted hover:text-brand-ink"
        >
          ← Volver al catálogo
        </Link>

        <div className="grid gap-8 rounded-xl border border-brand-border bg-white p-6 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-lg bg-brand-image-surface">
            {mainImage ? (
              <img
                src={mainImage.url}
                alt={mainImage.alt ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-brand-placeholder">
                Sin imagen
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-brand-text-subtle">
              {product.category.name}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-brand-ink">
              {product.name}
            </h1>

            {(product.brand || product.model) && (
              <p className="mt-2 text-brand-text-subtle">
                {[product.brand, product.model]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {product.description && (
              <p className="mt-6 leading-7 text-brand-muted">
                {product.description}
              </p>
            )}

            {product.variants.length > 0 && (
              <AddToCartButton
                productId={product.id}
                name={product.name}
                image={mainImage?.url ?? null}
                variants={product.variants.map((variant) => ({
                  ...variant,
                  price: Number(variant.price),
                  optionValues: variant.optionValues.map(({ value }) => ({
                    name: value.option.name,
                    value: value.value,
                  })),
                }))}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
