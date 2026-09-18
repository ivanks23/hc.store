import { z } from "zod";

export const variantAttributeSchema = z.object({
  attributeId: z.string().min(1, "El atributo es obligatorio"),

  value: z
    .string()
    .min(1, "El valor es obligatorio")
    .max(200, "El valor es demasiado largo"),
});

export type VariantAttributeInput = z.infer<
  typeof variantAttributeSchema
>;
