import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adminVariantUpdateSchema } from "@/lib/validations/admin";

type RouteContext = { params: Promise<{ variantId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const { variantId } = await context.params;
    const result = adminVariantUpdateSchema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "Datos de variante inválidos" }, { status: 400 });
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
    if (!variant) return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });
    if (result.data.sku) {
      const duplicate = await prisma.productVariant.findFirst({ where: { sku: result.data.sku, NOT: { id: variantId } }, select: { id: true } });
      if (duplicate) return NextResponse.json({ error: "El SKU ya existe" }, { status: 409 });
    }
    const updated = await prisma.productVariant.update({ where: { id: variantId }, data: result.data, select: { id: true, sku: true, price: true } });
    return NextResponse.json({ ...updated, price: updated.price.toString() });
  } catch (error) { console.error("Error al actualizar variante:", error); return NextResponse.json({ error: "No se pudo actualizar la variante" }, { status: 500 }); }
}
