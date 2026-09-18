import { z } from "zod";

export const productSchema = z.object({
  categoryId: z.string().min(1, "La categoría es obligatoria"),

  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(200, "El nombre es demasiado largo"),

  brand: z
    .string()
    .max(100, "La marca es demasiado larga")
    .optional(),

  model: z
    .string()
    .max(100, "El modelo es demasiado largo")
    .optional(),

  description: z
    .string()
    .max(5000, "La descripción es demasiado larga")
    .optional(),

  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(200, "El slug es demasiado largo")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug solo puede contener letras minúsculas, números y guiones",
    ),
});

export type ProductInput = z.infer<typeof productSchema>;