import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adminProductUpdateSchema } from "@/lib/validations/admin";

type RouteContext = { params: Promise<{ productId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { productId } = await context.params;
    const result = adminProductUpdateSchema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "Datos de producto inválidos" }, { status: 400 });

    if (result.data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: result.data.categoryId }, select: { id: true } });
      if (!category) return NextResponse.json({ error: "La categoría no existe" }, { status: 404 });
    }

    const current = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!current) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const product = await prisma.product.update({ where: { id: productId }, data: result.data });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error al actualizar producto administrativo:", error);
    return NextResponse.json({ error: "No se pudo actualizar el producto" }, { status: 500 });
  }
}
