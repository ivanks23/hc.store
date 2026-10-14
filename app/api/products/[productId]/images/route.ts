import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";
import { productImageSchema } from "@/lib/validations/product-image";
import { z } from "zod";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

const reorderSchema = z.object({
  imageIds: z.array(z.string().min(1)).min(1).max(50),
});

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
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

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

    const imageCount = await prisma.productImage.count({ where: { productId } });
    if (imageCount >= 50) {
      return NextResponse.json(
        { error: "Cada producto puede tener hasta 50 imágenes" },
        { status: 409 },
      );
    }

    const { url, alt, position, variantId } = result.data;
    if (variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId, productId },
        select: { id: true },
      });
      if (!variant) return NextResponse.json({ error: "La variante no pertenece a este producto" }, { status: 400 });
    }

    const image = await prisma.productImage.create({
      data: {
        productId,
        variantId: variantId ?? null,
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

export async function PUT(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { productId } = await context.params;
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success || new Set(parsed.data?.imageIds ?? []).size !== parsed.data?.imageIds.length) {
      return NextResponse.json({ error: "La lista de imágenes no es válida" }, { status: 400 });
    }

    const currentImages = await prisma.productImage.findMany({
      where: { productId },
      select: { id: true },
    });
    const submittedIds = new Set(parsed.data.imageIds);
    if (currentImages.length !== submittedIds.size || currentImages.some((image) => !submittedIds.has(image.id))) {
      return NextResponse.json({ error: "La galería cambió. Recárgala e intenta de nuevo." }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await Promise.all(parsed.data.imageIds.map((id, position) =>
        tx.productImage.update({ where: { id }, data: { position } }),
      ));
    });

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" },
    });
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error al reordenar imágenes:", error);
    return NextResponse.json({ error: "No se pudo cambiar el orden de las imágenes" }, { status: 500 });
  }
}
