import Link from "next/link";

type ProductVariant = {
  id: string;
  sku: string;
  price: string;
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
  slug: string;
  variants: ProductVariant[];
  images: ProductImage[];
};

async function getProducts(): Promise<Product[]> {
  const response = await fetch("http://localhost:3000/api/products", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar los productos");
  }

  return response.json();
}

export default async function CatalogPage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Catálogo
          </h1>

          <p className="mt-2 text-gray-600">
            Explora nuestros productos.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
            <p className="text-gray-600">
              No hay productos disponibles.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const mainImage = product.images[0];
              const firstVariant = product.variants[0];

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                >
                  <div className="aspect-square bg-gray-100">
                    {mainImage ? (
                      <img
                        src={mainImage.url}
                        alt={mainImage.alt ?? product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {product.brand && (
                      <p className="text-sm text-gray-500">
                        {product.brand}
                      </p>
                    )}

                    <h2 className="mt-1 text-lg font-semibold text-gray-900">
                      {product.name}
                    </h2>

                    {product.model && (
                      <p className="mt-1 text-sm text-gray-500">
                        {product.model}
                      </p>
                    )}

                    {firstVariant && (
                      <p className="mt-4 text-xl font-bold text-gray-900">
                        ${firstVariant.price}
                      </p>
                    )}

                    <Link
                      href={`/catalog/${product.slug}`}
                      className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
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