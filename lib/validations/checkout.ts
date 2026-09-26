import { z } from "zod";

const addressSchema = z.object({
  street: z
    .string()
    .min(2, "La calle es obligatoria")
    .max(150, "La calle es demasiado larga"),

  exteriorNumber: z
    .string()
    .min(1, "El número exterior es obligatorio")
    .max(20, "El número exterior es demasiado largo"),

  interiorNumber: z
    .string()
    .max(20, "El número interior es demasiado largo")
    .optional(),

  neighborhood: z
    .string()
    .min(2, "La colonia es obligatoria")
    .max(100, "La colonia es demasiado larga"),

  municipality: z
    .string()
    .min(2, "El municipio o alcaldía es obligatorio")
    .max(100, "El municipio o alcaldía es demasiado largo"),

  state: z
    .string()
    .min(2, "El estado es obligatorio"),

  postalCode: z
    .string()
    .regex(/^\d{5}$/, "El código postal debe tener 5 dígitos"),

  references: z
    .string()
    .max(300, "Las referencias son demasiado largas")
    .optional(),
});

export const checkoutSchema = z
  .object({
    customerName: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre es demasiado largo"),

    customerPhone: z
      .string()
      .min(10, "Ingresa un teléfono válido")
      .max(20, "El teléfono es demasiado largo"),

    customerEmail: z
      .string()
      .email("Ingresa un correo electrónico válido"),

    shippingAddress: addressSchema,

    wantsInvoice: z.boolean(),

    billingSameAsShipping: z.boolean(),

    billingBusinessName: z
      .string()
      .max(254, "La razón social es demasiado larga")
      .optional(),

    billingRfc: z
      .string()
      .max(13, "El RFC no puede tener más de 13 caracteres")
      .optional(),

    billingRegime: z
      .string()
      .optional(),

    billingCfdiUse: z
      .string()
      .optional(),

    billingAddress: addressSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.wantsInvoice) {
      return;
    }

    if (!data.billingBusinessName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["billingBusinessName"],
        message: "La razón social es obligatoria",
      });
    }

    if (!data.billingRfc?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["billingRfc"],
        message: "El RFC es obligatorio",
      });
    }

    if (!data.billingRegime?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["billingRegime"],
        message: "El régimen fiscal es obligatorio",
      });
    }

    if (!data.billingCfdiUse?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["billingCfdiUse"],
        message: "El uso de CFDI es obligatorio",
      });
    }

    if (!data.billingSameAsShipping && !data.billingAddress) {
      ctx.addIssue({
        code: "custom",
        path: ["billingAddress"],
        message: "La dirección fiscal es obligatoria",
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;