import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { productImageSchema } from "@/lib/validations/product-image";

type RouteContext = {
  params: Promise<{
    productId: string;
    imageId: string;
  }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { productId, imageId } = await context.params;

    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: "La imagen no existe para este producto" },
        { status: 404 },
      );
    }

    await prisma.productImage.delete({
      where: {
        id: imageId,
      },
    });

    return NextResponse.json({
      message: "Imagen eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar imagen:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la imagen" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { productId, imageId } = await context.params;

    const body = await request.json();

    const result = productImageSchema
      .pick({
        alt: true,
        position: true,
      })
      .partial()
      .safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (Object.keys(result.data).length === 0) {
      return NextResponse.json(
        { error: "No hay datos para actualizar" },
        { status: 400 },
      );
    }

    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: "La imagen no existe para este producto" },
        { status: 404 },
      );
    }

    const updatedImage = await prisma.productImage.update({
      where: {
        id: imageId,
      },
      data: result.data,
    });

    return NextResponse.json(updatedImage);
  } catch (error) {
    console.error("Error al actualizar imagen:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la imagen" },
      { status: 500 },
    );
  }
}