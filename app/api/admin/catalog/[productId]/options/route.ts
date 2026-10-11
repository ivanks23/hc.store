import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ productId: string }> };
const schema = z.object({ options: z.array(z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(80), values: z.array(z.object({ id: z.string().optional(), value: z.string().trim().min(1).max(100) })).min(1).max(30) })).max(5) });
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export async function GET(_request: Request, context: Context) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { productId } = await context.params;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, slug: true, options: { orderBy: { position: "asc" }, include: { values: { orderBy: { position: "asc" } } } }, variants: { select: { id: true, sku: true, price: true, isActive: true, optionValues: { select: { valueId: true } } }, orderBy: { sku: "asc" } } } });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  return NextResponse.json({ ...product, variants: product.variants.map(v => ({ ...v, price: v.price.toString(), optionValueIds: v.optionValues.map(x => x.valueId) })) });
}

export async function PUT(request: Request, context: Context) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const { productId } = await context.params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revisa los nombres y valores de las opciones" }, { status: 400 });

  const optionSlugs = parsed.data.options.map(option => slugify(option.name));
  if (optionSlugs.some((slug, index) => !slug || optionSlugs.indexOf(slug) !== index)) return NextResponse.json({ error: "Los nombres de opción deben ser únicos" }, { status: 400 });
  for (const option of parsed.data.options) {
    const valueSlugs = option.values.map(item => slugify(item.value));
    if (valueSlugs.some((slug, index) => !slug || valueSlugs.indexOf(slug) !== index)) return NextResponse.json({ error: `Los valores de “${option.name}” deben ser únicos` }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async tx => {
      const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!product) return null;
      const currentOptions = await tx.productOption.findMany({ where: { productId }, include: { values: true } });
      const submittedOptionIds = new Set(parsed.data.options.flatMap(option => option.id ? [option.id] : []));
      for (const currentOption of currentOptions) {
        if (!submittedOptionIds.has(currentOption.id)) {
          const assigned = await tx.variantOptionValue.count({ where: { value: { optionId: currentOption.id } } });
          if (assigned) throw new Error(`OPTION_IN_USE:${currentOption.name}`);
          await tx.productOption.delete({ where: { id: currentOption.id } });
        }
      }
      const saved = [];
      for (const [position, input] of parsed.data.options.entries()) {
        let option;
        if (input.id) {
          const existing = await tx.productOption.findFirst({ where: { id: input.id, productId }, select: { id: true } });
          if (!existing) throw new Error("Una opción no pertenece a este producto");
          option = await tx.productOption.update({ where: { id: input.id }, data: { name: input.name, slug: slugify(input.name), position } });
        } else {
          option = await tx.productOption.create({ data: { productId, name: input.name, slug: slugify(input.name), position } });
        }
        const currentValues = await tx.productOptionValue.findMany({ where: { optionId: option.id }, select: { id: true, value: true } });
        const submittedValueIds = new Set(input.values.flatMap(item => item.id ? [item.id] : []));
        for (const currentValue of currentValues) {
          if (!submittedValueIds.has(currentValue.id)) {
            const assigned = await tx.variantOptionValue.count({ where: { valueId: currentValue.id } });
            if (assigned) throw new Error(`VALUE_IN_USE:${currentValue.value}`);
            await tx.productOptionValue.delete({ where: { id: currentValue.id } });
          }
        }
        const values = [];
        for (const [valuePosition, item] of input.values.entries()) {
          if (item.id) {
            const current = await tx.productOptionValue.findFirst({ where: { id: item.id, optionId: option.id }, select: { id: true } });
            if (!current) throw new Error("Un valor no pertenece a esta opción");
            values.push(await tx.productOptionValue.update({ where: { id: item.id }, data: { value: item.value, slug: slugify(item.value), position: valuePosition } }));
          } else {
            values.push(await tx.productOptionValue.create({ data: { optionId: option.id, value: item.value, slug: slugify(item.value), position: valuePosition } }));
          }
        }
        saved.push({ ...option, values });
      }
      return saved;
    });
    if (!result) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    return NextResponse.json({ options: result });
  } catch (error) {
    console.error("Error al guardar opciones de producto:", error);
    if (error instanceof Error && (error.message.startsWith("OPTION_IN_USE:") || error.message.startsWith("VALUE_IN_USE:"))) return NextResponse.json({ error: `No se puede eliminar “${error.message.split(":")[1]}” porque ya está asignado a una variante.` }, { status: 409 });
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "Ya existe una opción o valor con ese nombre" }, { status: 409 });
    return NextResponse.json({ error: "No se pudieron guardar las opciones" }, { status: 500 });
  }
}
