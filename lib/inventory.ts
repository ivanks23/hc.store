import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

export async function registerOrderItemSale(orderItemId: string) {
  return prisma.$transaction(async (tx) => {
    const orderItem = await tx.orderItem.findUnique({
      where: {
        id: orderItemId,
      },
    });

    if (!orderItem) {
      throw new Error("OrderItem no encontrado");
    }

    const existingMovement = await tx.inventoryMovement.findUnique({
      where: {
        orderItemId,
      },
    });

    if (existingMovement) {
      return existingMovement;
    }

    try {
      return await tx.inventoryMovement.create({
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
        return tx.inventoryMovement.findUniqueOrThrow({
          where: {
            orderItemId,
          },
        });
      }

      throw error;
    }
  });
}