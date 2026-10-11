import { z } from "zod";

import { productSchema } from "@/lib/validations/product";

export const inventoryMovementSchema = z.object({
  variantId: z.string().min(1),
  type: z.enum(["PURCHASE", "ADJUSTMENT", "RETURN"]),
  quantity: z.number().int().refine((quantity) => quantity !== 0, {
    message: "La cantidad debe ser distinta de cero",
  }),
  reason: z.string().trim().min(3).max(240),
}).superRefine((movement, context) => {
  if (movement.type !== "ADJUSTMENT" && movement.quantity < 0) {
    context.addIssue({
      code: "custom",
      message: "Las reposiciones y devoluciones deben sumar existencias",
      path: ["quantity"],
    });
  }
});

export const resolveReviewOrderSchema = z.object({
  orderId: z.string().min(1),
});

export const updateDeliveryStatusSchema = z.object({
  orderId: z.string().min(1),
  deliveryStatus: z.enum(["PENDING", "PREPARING", "SHIPPED", "DELIVERED"]),
});

export const adminProductSchema = productSchema.extend({
  isActive: z.boolean().default(true),
});

export const adminProductUpdateSchema = adminProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "No hay datos para actualizar",
);
