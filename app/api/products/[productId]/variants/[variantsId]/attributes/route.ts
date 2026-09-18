import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { variantAttributeSchema } from "@/lib/validations/variant-attribute";

type RouteContext = {
  params: Promise<{
    productId: string;
    variantsId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { productId, variantsId: variantId } = await context.params;

    const body = await request.json();

    const result = variantAttributeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { attributeId, value } = result.data;

    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: "La variante no existe para este producto" },
        { status: 404 },
      );
    }

    const attribute = await prisma.attribute.findUnique({
      where: {
        id: attributeId,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: "El atributo no existe" },
        { status: 404 },
      );
    }

    const existingAssignment =
      await prisma.variantAttribute.findUnique({
        where: {
          variantId_attributeId: {
            variantId,
            attributeId,
          },
        },
      });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "El atributo ya está asignado a esta variante" },
        { status: 409 },
      );
    }

    const variantAttribute =
      await prisma.variantAttribute.create({
        data: {
          variantId,
          attributeId,
          value,
        },
        include: {
          attribute: true,
        },
      });

    return NextResponse.json(variantAttribute, {
      status: 201,
    });
  } catch (error) {
    console.error("Error al asignar atributo:", error);

    return NextResponse.json(
      { error: "No se pudo asignar el atributo" },
      { status: 500 },
    );
  }
}