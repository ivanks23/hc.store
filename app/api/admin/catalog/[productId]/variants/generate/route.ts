import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ productId: string }> };
const schema = z.object({ combinations: z.array(z.object({ optionValueIds: z.array(z.string()).min(1).max(5), sku: z.string().trim().min(2).max(100), price: z.number().positive() })).min(1).max(100) });
export async function POST(request: Request, context: Context) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { productId } = await context.params; const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Combinaciones inválidas (máximo 100)" }, { status: 400 });
  const skuSet = parsed.data.combinations.map(c => c.sku.toUpperCase());
  if (new Set(skuSet).size !== skuSet.length) return NextResponse.json({ error: "Las combinaciones generan SKU repetidos; ajusta sus SKU" }, { status: 400 });
  const comboSet = parsed.data.combinations.map(c => [...c.optionValueIds].sort().join("|"));
  if (new Set(comboSet).size !== comboSet.length) return NextResponse.json({ error: "Hay combinaciones duplicadas" }, { status: 400 });
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;
      const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true, options: { select: { id: true, values: { select: { id: true } } } } } });
      if (!product) return { missing: true as const };
      if (product.options.length === 0) return { noOptions: true as const };
      const optionIds = new Set(product.options.map(o => o.id));
      const allValueIds = new Set(product.options.flatMap(o => o.values.map(v => v.id)));
      for (const combination of parsed.data.combinations) {
        if (combination.optionValueIds.length !== product.options.length || combination.optionValueIds.some(id => !allValueIds.has(id))) return { invalid: true as const };
        const associated = await tx.productOptionValue.findMany({ where: { id: { in: combination.optionValueIds } }, select: { optionId: true } });
        if (new Set(associated.map(v => v.optionId)).size !== optionIds.size) return { invalid: true as const };
      }
      const existing = await tx.productVariant.findMany({ where: { productId }, select: { sku: true, isActive: true, optionValues: { select: { valueId: true } } } });
      const unlinkedActiveCount = existing.filter(variant => variant.isActive && variant.optionValues.length !== product.options.length).length;
      if (unlinkedActiveCount > 0) return { unlinkedActiveCount };
      const existingCombinations = new Set(existing.filter(v => v.optionValues.length).map(v => v.optionValues.map(x => x.valueId).sort().join("|")));
      const existingSkus = new Set(existing.map(v => v.sku.toUpperCase()));
      const create = parsed.data.combinations.filter(c => !existingCombinations.has([...c.optionValueIds].sort().join("|")));
      if (create.some(c => existingSkus.has(c.sku.toUpperCase()))) return { duplicateSku: true as const };
      for (const c of create) await tx.productVariant.create({ data: { productId, sku: c.sku.toUpperCase(), price: c.price, optionValues: { create: c.optionValueIds.map(valueId => ({ valueId })) } } });
      return { created: create.length, skipped: parsed.data.combinations.length - create.length };
    });
    if ("missing" in result) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    if ("noOptions" in result) return NextResponse.json({ error: "Primero configura opciones y valores" }, { status: 409 });
    if ("invalid" in result) return NextResponse.json({ error: "Cada combinación debe tener un valor válido por opción" }, { status: 400 });
    if ("duplicateSku" in result) return NextResponse.json({ error: "Un SKU ya pertenece a otra variante" }, { status: 409 });
    if ("unlinkedActiveCount" in result) return NextResponse.json({ error: `Primero vincula las ${result.unlinkedActiveCount} variantes activas existentes en el paso 3 para evitar duplicados.` }, { status: 409 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) { console.error("Error al generar variantes:", error); return NextResponse.json({ error: "No se pudieron generar las variantes" }, { status: 500 }); }
}
