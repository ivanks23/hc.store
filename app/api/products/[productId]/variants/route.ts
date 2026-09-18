import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productVariantSchema } from "@/lib/validations/product-variant";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { productId } = await context.params;

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "El producto no existe" },
        { status: 404 },
      );
    }

    const variants = await prisma.productVariant.findMany({
      where: {
        productId,
      },
      orderBy: {
        sku: "asc",
      },
    });

    return NextResponse.json(variants);
  } catch (error) {
    console.error("Error al obtener variantes:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener las variantes" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { productId } = await context.params;

    const body = await request.json();

    const result = productVariantSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { sku, price } = result.data;

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "El producto no existe" },
        { status: 404 },
      );
    }

    const existingVariant = await prisma.productVariant.findUnique({
      where: {
        sku,
      },
    });

    if (existingVariant) {
      return NextResponse.json(
        { error: "El SKU ya existe" },
        { status: 409 },
      );
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku,
        price,
      },
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error("Error al crear variante:", error);

    return NextResponse.json(
      { error: "No se pudo crear la variante" },
      { status: 500 },
    );
  }
}