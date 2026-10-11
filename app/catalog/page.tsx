import Link from "next/link";

import { getVariantStocks } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

export default async function CatalogPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      slug: true,
      variants: {
        where: { isActive: true },
        select: { id: true, sku: true, price: true },
        orderBy: { price: "asc" },
      },
      images: {
        select: { id: true, url: true, alt: true, position: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  const stocks = await getVariantStocks(
    products.flatMap((product) => product.variants.map((variant) => variant.id)),
  );
  const availableProducts = products.filter((product) =>
    product.variants.some((variant) => (stocks.get(variant.id) ?? 0) > 0),
  );

  return (
    <main className="min-h-screen bg-brand-background px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-ink">
            Catálogo
          </h1>

          <p className="mt-2 text-brand-muted">
            Explora nuestros productos.
          </p>
        </div>

        {availableProducts.length === 0 ? (
          <div className="rounded-lg border border-brand-border bg-white p-10 text-center">
            <p className="text-brand-muted">
              No hay productos disponibles.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {availableProducts.map((product) => {
              const mainImage = product.images[0];
              const firstVariant =
                product.variants.find(
                  (variant) => (stocks.get(variant.id) ?? 0) > 0,
                ) ?? product.variants[0];
              const availableStock = product.variants.reduce(
                (total, variant) => total + (stocks.get(variant.id) ?? 0),
                0,
              );

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-brand-border bg-white"
                >
                  <div className="aspect-square bg-brand-image-surface">
                    {mainImage ? (
                      <img
                        src={mainImage.url}
                        alt={mainImage.alt ?? product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-brand-placeholder">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {product.brand && (
                      <p className="text-sm text-brand-text-subtle">
                        {product.brand}
                      </p>
                    )}

                    <h2 className="mt-1 text-lg font-semibold text-brand-ink">
                      {product.name}
                    </h2>

                    {product.model && (
                      <p className="mt-1 text-sm text-brand-text-subtle">
                        {product.model}
                      </p>
                    )}

                    {firstVariant && (
                      <p className="mt-4 text-xl font-bold text-brand-ink">
                        ${firstVariant.price.toFixed(2)}
                      </p>
                    )}

                    {firstVariant && (
                      <p className="mt-1 text-sm text-brand-muted">
                        {availableStock > 0
                          ? `${availableStock} disponibles entre sus variantes`
                          : "Agotado"}
                      </p>
                    )}

                    <Link
                      href={`/catalog/${product.slug}`}
                      className="mt-4 inline-block rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-white"
                    >
                      Ver producto
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
