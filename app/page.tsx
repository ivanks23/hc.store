import Link from "next/link";

import { getVariantStocks } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";

async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: { variants: { some: {} } },
    select: {
      id: true,
      name: true,
      brand: true,
      slug: true,
      images: {
        select: { url: true, alt: true },
        orderBy: { position: "asc" },
        take: 1,
      },
      variants: {
        select: { id: true, price: true },
        orderBy: { price: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const stocks = await getVariantStocks(
    products.flatMap((product) => product.variants.map((variant) => variant.id)),
  );

  return products
    .map((product) => {
      const firstAvailableVariant = product.variants.find(
        (variant) => (stocks.get(variant.id) ?? 0) > 0,
      );
      const lowestPriceVariant = product.variants[0];

      return {
        ...product,
        variant: firstAvailableVariant ?? lowestPriceVariant,
        availableStock: firstAvailableVariant
          ? stocks.get(firstAvailableVariant.id) ?? 0
          : 0,
      };
    })
    .filter((product) => product.availableStock > 0)
    .slice(0, 4);
}

export default async function Home() {
  const products = await getFeaturedProducts();

  return (
    <main className="bg-brand-background text-brand-ink">
      <section className="relative isolate overflow-hidden bg-brand-ink text-brand-background">
        <div className="absolute -right-24 -top-28 -z-10 h-[32rem] w-[32rem] rounded-full bg-brand-accent opacity-15 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-px w-full bg-white/10" />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
              Hypercode Store
            </p>
            <h1 className="mt-7 max-w-2xl text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
              Tecnología útil. <span className="text-brand-accent">Elegida</span>
              <br className="hidden sm:block" /> para tu día a día.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              Encuentra productos y accesorios seleccionados para trabajar,
              crear y disfrutar mejor cada día.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center rounded-full bg-brand-accent px-7 py-3.5 text-sm font-bold text-brand-ink transition hover:bg-brand-accent-hover"
              >
                Explorar catálogo <span className="ml-2" aria-hidden="true">↗</span>
              </Link>
              <Link
                href="#destacados"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ver destacados
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm text-white/55">
              <span>Compra segura con Mercado Pago</span>
              <span>Existencias actualizadas</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-5 rounded-[2rem] border border-brand-accent/30" />
            <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-[1.7rem] bg-[radial-gradient(circle_at_72%_28%,#45634c_0%,#26392f_34%,#1d2923_68%)] p-7 sm:p-9">
              <div className="absolute right-8 top-7 h-32 w-32 rounded-full border border-white/15 sm:right-12 sm:top-10 sm:h-44 sm:w-44" />
              <div className="absolute right-16 top-14 h-20 w-20 rounded-full border border-brand-accent/40 sm:right-24 sm:top-18 sm:h-28 sm:w-28" />
              <div className="absolute right-12 top-12 h-24 w-24 rounded-full bg-brand-accent/20 blur-2xl sm:right-20 sm:top-16 sm:h-36 sm:w-36" />
              <div className="relative max-w-xs">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
                  Menos ruido. Más enfoque.
                </p>
                <p className="mt-3 text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl">
                  Encuentra tu siguiente favorito.
                </p>
              </div>
              <span className="absolute bottom-7 right-7 text-5xl font-light text-white/70" aria-hidden="true">⌁</span>
            </div>
          </div>
        </div>
      </section>

      <section id="destacados" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Selección de la tienda</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Productos destacados</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-brand-muted sm:text-base">
              Explora lo que tenemos disponible y encuentra los detalles de cada producto.
            </p>
          </div>
          <Link href="/catalog" className="w-fit text-sm font-bold text-brand-forest underline decoration-brand-green-line underline-offset-4 hover:text-brand-green">
            Ver todo el catálogo <span aria-hidden="true">→</span>
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-9 rounded-2xl border border-brand-border bg-white p-8 text-sm text-brand-muted">
            Estamos preparando el catálogo. Vuelve pronto para descubrir nuestros productos.
          </div>
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-2xl border border-brand-border bg-white transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-ink/[0.07]">
                <Link href={`/catalog/${product.slug}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-brand-image-surface">
                    {product.images[0] ? (
                      // Product image URLs are stored by the store and can be remote.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0].url} alt={product.images[0].alt ?? product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl font-light text-brand-placeholder" aria-hidden="true">H.</div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-forest">
                      {product.availableStock > 0 ? `${product.availableStock} disponibles` : "Agotado"}
                    </span>
                  </div>
                  <div className="p-5">
                    {product.brand && <p className="text-xs font-semibold uppercase tracking-wider text-brand-text-subtle">{product.brand}</p>}
                    <h3 className="mt-2 line-clamp-2 min-h-12 text-base font-semibold text-brand-ink">{product.name}</h3>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-lg font-bold">${product.variant?.price.toFixed(2) ?? "—"}</p>
                      <span className="text-sm font-bold text-brand-green">Ver producto <span aria-hidden="true">↗</span></span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-brand-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8">
          {[
            { mark: "01", title: "Compra con confianza", detail: "Tu pago se procesa de forma segura con Mercado Pago." },
            { mark: "02", title: "Stock transparente", detail: "Consulta las existencias antes de agregar al carrito." },
            { mark: "03", title: "Acompañamiento", detail: "Revisa el estado de tus pedidos desde tu cuenta." },
          ].map((item) => (
            <div key={item.mark} className="flex gap-4">
              <span className="pt-1 text-xs font-bold tracking-widest text-brand-green-muted">{item.mark}</span>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-brand-text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
