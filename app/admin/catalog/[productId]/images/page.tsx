import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

import ProductImagesManager from "./product-images-manager";

type PageProps = { params: Promise<{ productId: string }> };

export const metadata = { title: "Imágenes del producto" };

export default async function ProductImagesPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/catalog");
  if (session.user.role !== "ADMIN") redirect("/");

  const { productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      variants: {
        orderBy: { sku: "asc" },
        select: {
          id: true,
          sku: true,
          isActive: true,
          optionValues: {
            select: { value: { select: { value: true, option: { select: { name: true } } } } },
          },
        },
      },
    },
  });

  if (!product) notFound();

  return (
    <main className="min-h-screen bg-brand-background px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/catalog" className="text-sm font-semibold text-brand-secondary">
          ← Volver al catálogo
        </Link>
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-green">Catálogo</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Imágenes del producto</h1>
          <p className="mt-2 text-brand-muted">{product.name} · /{product.slug}</p>
        </div>
        <ProductImagesManager
          productId={product.id}
          productName={product.name}
          variants={product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            isActive: variant.isActive,
            label: variant.optionValues.map(({ value }) => `${value.option.name}: ${value.value}`).join(" · "),
          }))}
        />
      </div>
    </main>
  );
}
