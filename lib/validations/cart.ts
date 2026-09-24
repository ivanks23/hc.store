import { z } from "zod";

export const cartItemSchema = z.object({
  variantId: z
    .string()
    .min(1, "La variante es obligatoria"),

  quantity: z
    .number()
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor que cero"),
});

export const cartSchema = z.object({
  items: z
    .array(cartItemSchema)
    .min(1, "El carrito no puede estar vacío"),
});

export type CartInput = z.infer<typeof cartSchema>;