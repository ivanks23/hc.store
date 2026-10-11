import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ productId: string }> };

const schema = z.object({
  assignments: z
    .array(
      z.object({
        variantId: z.string().min(1),
        optionValueIds: z.array(z.string().min(1)).min(1).max(5),
      }),
    )
    .min(1)
    .max(100),
});

export async function PUT(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { productId } = await context.params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Selecciona un valor por cada opción del producto" },
      { status: 400 },
    );
  }

  const submitted = parsed.data.assignments;
  const variantIds = submitted.map((item) => item.variantId);
  if (new Set(variantIds).size !== variantIds.length) {
    return NextResponse.json(
      { error: "No repitas una variante en la misma solicitud" },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          options: {
            select: {
              id: true,
              values: { select: { id: true } },
            },
          },
          variants: {
            select: {
              id: true,
              sku: true,
              optionValues: { select: { valueId: true } },
            },
          },
        },
      });

      if (!product) return { kind: "missing" as const };
      if (!product.options.length) return { kind: "no-options" as const };

      const valueOptionIds = new Map(
        product.options.flatMap((option) =>
          option.values.map((value) => [value.id, option.id] as const),
        ),
      );
      const assignmentByVariant = new Map<string, string>();
      const usedCombinations = new Map<string, string>();

      for (const assignment of submitted) {
        const variant = product.variants.find(
          (item) => item.id === assignment.variantId,
        );
        if (!variant) return { kind: "variant-missing" as const };

        const selectedOptionIds = assignment.optionValueIds.map((valueId) =>
          valueOptionIds.get(valueId),
        );
        if (
          assignment.optionValueIds.length !== product.options.length ||
          selectedOptionIds.some((optionId) => !optionId) ||
          new Set(selectedOptionIds).size !== product.options.length
        ) {
          return { kind: "invalid-values" as const };
        }

        const combinationKey = [...assignment.optionValueIds].sort().join("|");
        const existingSku = usedCombinations.get(combinationKey);
        if (existingSku) {
          return { kind: "duplicate-combination" as const, existingSku };
        }
        usedCombinations.set(combinationKey, variant.sku);
        assignmentByVariant.set(assignment.variantId, combinationKey);
      }

      for (const variant of product.variants) {
        if (assignmentByVariant.has(variant.id) || !variant.optionValues.length) {
          continue;
        }
        const combinationKey = variant.optionValues
          .map((item) => item.valueId)
          .sort()
          .join("|");
        const existingSku = usedCombinations.get(combinationKey);
        if (existingSku) {
          return { kind: "duplicate-combination" as const, existingSku: variant.sku };
        }
        usedCombinations.set(combinationKey, variant.sku);
      }

      for (const assignment of submitted) {
        await tx.variantOptionValue.deleteMany({
          where: { variantId: assignment.variantId },
        });
        await tx.variantOptionValue.createMany({
          data: assignment.optionValueIds.map((valueId) => ({
            variantId: assignment.variantId,
            valueId,
          })),
        });
      }

      return { kind: "saved" as const };
    });

    if (result.kind === "missing") {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    if (result.kind === "no-options") {
      return NextResponse.json(
        { error: "Primero configura las opciones del producto" },
        { status: 409 },
      );
    }
    if (result.kind === "variant-missing") {
      return NextResponse.json(
        { error: "Una variante no pertenece a este producto" },
        { status: 400 },
      );
    }
    if (result.kind === "invalid-values") {
      return NextResponse.json(
        { error: "Cada variante debe tener un valor válido por opción" },
        { status: 400 },
      );
    }
    if (result.kind === "duplicate-combination") {
      return NextResponse.json(
        { error: `Esa combinación ya está asignada al SKU ${result.existingSku}. Cada combinación solo puede pertenecer a una variante.` },
        { status: 409 },
      );
    }

    return NextResponse.json({ assigned: submitted.length });
  } catch (error) {
    console.error("Error al vincular opciones a variantes:", error);
    return NextResponse.json(
      { error: "No se pudieron vincular las opciones a las variantes" },
      { status: 500 },
    );
  }
}
