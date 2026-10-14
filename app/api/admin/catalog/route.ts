import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getVariantStocks } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { adminProductSchema } from "@/lib/validations/admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.product.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, name: true, slug: true, brand: true, model: true, description: true, isActive: true,
          categoryId: true, category: { select: { name: true } },
          variants: { select: { id: true, sku: true, price: true, isActive: true }, orderBy: { sku: "asc" } },
          images: { select: { id: true, url: true, alt: true, position: true }, orderBy: { position: "asc" } },
        },
      }),
    ]);

    const variantStocks = await getVariantStocks(
      products.flatMap((product) => product.variants.map((variant) => variant.id)),
    );

    return NextResponse.json({
      categories,
      products: products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          price: variant.price.toString(),
          availableStock: variantStocks.get(variant.id) ?? 0,
        })),
      })),
    });
  } catch (error) {
    console.error("Error al consultar catálogo administrativo:", error);
    return NextResponse.json({ error: "No se pudo consultar el catálogo" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const result = adminProductSchema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "Datos de producto inválidos" }, { status: 400 });

    const { isActive, ...productData } = result.data;
    const category = await prisma.category.findUnique({ where: { id: productData.categoryId }, select: { id: true } });
    if (!category) return NextResponse.json({ error: "La categoría no existe" }, { status: 404 });

    const existing = await prisma.product.findFirst({ where: { OR: [{ name: productData.name }, { slug: productData.slug }] }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Ya existe un producto con ese nombre o slug" }, { status: 409 });

    const product = await prisma.product.create({ data: { ...productData, isActive } });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error al crear producto administrativo:", error);
    return NextResponse.json({ error: "No se pudo crear el producto" }, { status: 500 });
  }
}
