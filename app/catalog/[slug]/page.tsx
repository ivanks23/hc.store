import Link from "next/link";
import AddToCartButton from "./add-to-cart-button";

type ProductAttribute = {
  value: string;
  attribute: {
    name: string;
  };
};

type ProductVariant = {
  id: string;
  sku: string;
  price: string;
  attributes: ProductAttribute[];
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
  const response = await fetch(
    `http://localhost:3000/api/products/slug/${slug}`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("No se pudo cargar el producto");
  }

  return response.json();
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Producto no encontrado
          </h1>

          <Link
            href="/catalog"
            className="mt-6 inline-block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Volver al catálogo
          </Link>
        </div>
      </main>
    );
  }

  const mainImage = product.images[0];
  const firstVariant = product.variants[0];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/catalog"
          className="mb-6 inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Volver al catálogo
        </Link>

        <div className="grid gap-8 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            {mainImage ? (
              <img
                src={mainImage.url}
                alt={mainImage.alt ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Sin imagen
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-500">
              {product.category.name}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              {product.name}
            </h1>

            {(product.brand || product.model) && (
              <p className="mt-2 text-gray-500">
                {[product.brand, product.model]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {product.description && (
              <p className="mt-6 leading-7 text-gray-600">
                {product.description}
              </p>
            )}

            {firstVariant && (
              <p className="mt-8 text-3xl font-bold text-gray-900">
                ${firstVariant.price}
              </p>
            )}

            {product.variants.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900">
                  Variantes
                </h2>

                <div className="mt-3 space-y-3">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <p className="font-medium text-gray-900">
                        SKU: {variant.sku}
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        ${variant.price}
                      </p>

                      {variant.attributes.length > 0 && (
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {variant.attributes.map((item) => (
                            <p
                              key={`${variant.id}-${item.attribute.name}`}
                            >
                              {item.attribute.name}: {item.value}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {firstVariant && (
              <AddToCartButton
                variantId={firstVariant.id}
                productId={product.id}
                name={product.name}
                price={Number(firstVariant.price)}
                image={mainImage?.url ?? null}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}