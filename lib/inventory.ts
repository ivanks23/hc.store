import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaTransaction = Prisma.TransactionClient;

export const STOCK_RESERVATION_MINUTES = 30;

export function getStockReservationExpiry(from = new Date()) {
    return new Date(from.getTime() + STOCK_RESERVATION_MINUTES * 60 * 1000);
}

export async function getVariantStocks(
    variantIds: string[],
    client: PrismaTransaction | typeof prisma = prisma,
    now = new Date(),
) {
    const uniqueVariantIds = [...new Set(variantIds)];
    const stocks = new Map<string, number>();

    if (uniqueVariantIds.length === 0) {
        return stocks;
    }

    const [movementGroups, reservationGroups] = await Promise.all([
        client.inventoryMovement.groupBy({
            by: ["variantId"],
            where: { variantId: { in: uniqueVariantIds } },
            _sum: { quantity: true },
        }),
        client.orderItem.groupBy({
            by: ["variantId"],
            where: {
                variantId: { in: uniqueVariantIds },
                order: {
                    is: {
                        status: "PENDING",
                        reservationExpiresAt: { gt: now },
                    },
                },
            },
            _sum: { quantity: true },
        }),
    ]);

    const physicalStockByVariant = new Map(
        movementGroups.map((group) => [
            group.variantId,
            group._sum.quantity ?? 0,
        ]),
    );
    const reservedStockByVariant = new Map(
        reservationGroups.map((group) => [
            group.variantId,
            group._sum.quantity ?? 0,
        ]),
    );

    for (const variantId of uniqueVariantIds) {
        stocks.set(
            variantId,
            Math.max(
                (physicalStockByVariant.get(variantId) ?? 0) -
                    (reservedStockByVariant.get(variantId) ?? 0),
                0,
            ),
        );
    }

    return stocks;
}

export async function getVariantStock(
    variantId: string,
    client: PrismaTransaction | typeof prisma = prisma,
    now = new Date(),
) {
    const stocks = await getVariantStocks([variantId], client, now);
    return stocks.get(variantId) ?? 0;
}

export async function registerOrderItemSale(
    orderItemId: string,
    tx?: PrismaTransaction,
    options: { allowInsufficientStock?: boolean } = {},
) {
    const register = async (client: PrismaTransaction) => {
        const orderItem = await client.orderItem.findUnique({
            where: {
                id: orderItemId,
            },
        });

        if (!orderItem) {
            throw new Error("OrderItem no encontrado");
        }

        await client.$queryRaw`
  SELECT id
  FROM "ProductVariant"
  WHERE id = ${orderItem.variantId}
  FOR UPDATE
`;

        const existingMovement = await client.inventoryMovement.findUnique({
            where: {
                orderItemId,
            },
        });

        if (existingMovement) {
            return existingMovement;
        }

        const stockResult = await client.inventoryMovement.aggregate({
            where: {
                variantId: orderItem.variantId,
            },
            _sum: {
                quantity: true,
            },
        });

        const currentStock = stockResult._sum.quantity ?? 0;

        const stockShortfall = orderItem.quantity - currentStock;

        if (stockShortfall > 0 && !options.allowInsufficientStock) {
            throw new Error(
                `Stock insuficiente para la variante ${orderItem.variantId}`,
            );
        }

        if (stockShortfall > 0) {
            console.warn("Venta aprobada con inventario insuficiente:", {
                variantId: orderItem.variantId,
                available: currentStock,
                sold: orderItem.quantity,
                shortage: stockShortfall,
            });
        }

        try {
            return await client.inventoryMovement.create({
                data: {
                    variantId: orderItem.variantId,
                    orderItemId: orderItem.id,
                    type: "SALE",
                    quantity: -orderItem.quantity,
                    reason:
                        stockShortfall > 0
                            ? `Venta del pedido ${orderItem.orderId}; faltante de inventario: ${stockShortfall}`
                            : `Venta del pedido ${orderItem.orderId}`,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                return client.inventoryMovement.findUniqueOrThrow({
                    where: {
                        orderItemId,
                    },
                });
            }

            throw error;
        }
    };

    if (tx) {
        return register(tx);
    }

    return prisma.$transaction(register);
}
