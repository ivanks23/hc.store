import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { slug } = await context.params;

    const product = await prisma.product.findUnique({
      where: {
        slug,
      },
      include: {
        category: true,
        variants: {
          include: {
            attributes: {
              include: {
                attribute: true,
              },
            },
          },
          orderBy: {
            sku: "asc",
          },
        },
        images: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "El producto no existe" },
        { status: 404 },
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error al obtener producto por slug:", error);

    return NextResponse.json(
      { error: "No se pudo obtener el producto" },
      { status: 500 },
    );
  }
}