import { InventoryMovementType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const pageSize = 25;
const movementTypes = new Set<string>(Object.values(InventoryMovementType));

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;

  // Date inputs represent Mexico City calendar days (UTC-6).
  const mexicoMidnight = new Date(`${value}T00:00:00.000-06:00`);
  if (endOfDay) mexicoMidnight.setUTCDate(mexicoMidnight.getUTCDate() + 1);
  return mexicoMidnight;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const searchParams = new URL(request.url).searchParams;
    const page = Number(searchParams.get("page") ?? "1");
    const search = (searchParams.get("search") ?? "").trim().slice(0, 100);
    const type = searchParams.get("type") ?? "";
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"), true);

    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) {
      return NextResponse.json({ error: "Número de página inválido" }, { status: 400 });
    }
    if (type && !movementTypes.has(type)) {
      return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
    }
    if (from === undefined || to === undefined || (from && to && from >= to)) {
      return NextResponse.json({ error: "El periodo indicado no es válido" }, { status: 400 });
    }

    const where: Prisma.InventoryMovementWhereInput = {};
    if (type) where.type = type as InventoryMovementType;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lt: to } : {}),
      };
    }
    if (search) {
      where.variant = {
        is: {
          OR: [
            { sku: { contains: search, mode: "insensitive" } },
            { product: { is: { name: { contains: search, mode: "insensitive" } } } },
          ],
        },
      };
    }

    const [total, movements] = await Promise.all([
      prisma.inventoryMovement.count({ where }),
      prisma.inventoryMovement.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          quantity: true,
          reason: true,
          createdAt: true,
          variant: {
            select: {
              id: true,
              sku: true,
              product: { select: { name: true } },
            },
          },
          orderItem: { select: { orderId: true } },
        },
      }),
    ]);

    return NextResponse.json({
      movements: movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        createdAt: movement.createdAt,
        variantId: movement.variant.id,
        sku: movement.variant.sku,
        productName: movement.variant.product.name,
        orderId: movement.orderItem?.orderId ?? null,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("Error al consultar historial de inventario:", error);
    return NextResponse.json({ error: "No se pudo consultar el historial de inventario" }, { status: 500 });
  }
}
