import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { productImageSchema } from "@/lib/validations/product-image";

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

    const images = await prisma.productImage.findMany({
      where: {
        productId,
      },
      orderBy: {
        position: "asc",
      },
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error("Error al obtener imágenes:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener las imágenes" },
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

    const result = productImageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

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

    const { url, alt, position } = result.data;

    const image = await prisma.productImage.create({
      data: {
        productId,
        url,
        alt,
        position,
      },
    });

    return NextResponse.json(image, {
      status: 201,
    });
  } catch (error) {
    console.error("Error al crear imagen:", error);

    return NextResponse.json(
      { error: "No se pudo crear la imagen" },
      { status: 500 },
    );
  }
}