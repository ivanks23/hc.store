import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

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