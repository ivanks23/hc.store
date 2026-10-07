import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaTransaction = Prisma.TransactionClient;

export async function getVariantStock(variantId: string) {
    const result = await prisma.inventoryMovement.aggregate({
        where: {
            variantId,
        },
        _sum: {
            quantity: true,
        },
    });

    return result._sum.quantity ?? 0;
}

export async function registerOrderItemSale(
    orderItemId: string,
    tx?: PrismaTransaction,
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

        if (currentStock < orderItem.quantity) {
            throw new Error(
                `Stock insuficiente para la variante ${orderItem.variantId}`,
            );
        }

        try {
            return await client.inventoryMovement.create({
                data: {
                    variantId: orderItem.variantId,
                    orderItemId: orderItem.id,
                    type: "SALE",
                    quantity: -orderItem.quantity,
                    reason: `Venta del pedido ${orderItem.orderId}`,
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