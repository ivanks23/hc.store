import { z } from "zod";

export const productVariantSchema = z.object({
  sku: z
    .string()
    .min(2, "El SKU debe tener al menos 2 caracteres")
    .max(100, "El SKU es demasiado largo"),

  price: z
    .number()
    .positive("El precio debe ser mayor que cero"),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;