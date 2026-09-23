import { z } from "zod";

export const productImageSchema = z.object({
  url: z
    .string()
    .url("La URL de la imagen no es válida"),

  alt: z
    .string()
    .max(200, "El texto alternativo es demasiado largo")
    .optional(),

  position: z
    .number()
    .int("La posición debe ser un número entero")
    .min(0, "La posición no puede ser negativa")
    .default(0),
});

export type ProductImageInput = z.infer<typeof productImageSchema>;