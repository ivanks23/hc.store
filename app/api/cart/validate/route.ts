import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { cartSchema } from "@/lib/validations/cart";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = cartSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { items } = result.data;

    const variantIds = items.map((item) => item.variantId);

    const variants = await prisma.productVariant.findMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: {
                position: "asc",
              },
            },
          },
        },
        attributes: {
          include: {
            attribute: true,
          },
        },
      },
    });

    if (variants.length !== items.length) {
      return NextResponse.json(
        { error: "Una o más variantes no existen" },
        { status: 404 },
      );
    }

    const validatedItems = items.map((item) => {
      const variant = variants.find(
        (currentVariant) =>
          currentVariant.id === item.variantId,
      );

      if (!variant) {
        throw new Error("Variante no encontrada");
      }

      return {
        variantId: variant.id,
        productId: variant.productId,
        name: variant.product.name,
        price: variant.price.toString(),
        image: variant.product.images[0]?.url ?? null,
        quantity: item.quantity,
        attributes: variant.attributes,
      };
    });

    return NextResponse.json({
      items: validatedItems,
    });
  } catch (error) {
    console.error("Error al validar carrito:", error);

    return NextResponse.json(
      { error: "No se pudo validar el carrito" },
      { status: 500 },
    );
  }
}