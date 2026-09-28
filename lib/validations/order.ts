import { z } from "zod";

const addressSchema = z.object({
  street: z.string().min(2).max(150),
  exteriorNumber: z.string().min(1).max(20),
  interiorNumber: z.string().max(20).optional(),
  neighborhood: z.string().min(2).max(100),
  municipality: z.string().min(2).max(100),
  state: z.string().min(2),
  postalCode: z.string().regex(/^\d{5}$/),
  references: z.string().max(300).optional(),
});

const orderItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const orderSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(10).max(20),
  customerEmail: z.string().email(),

  shippingAddress: addressSchema,

  wantsInvoice: z.boolean(),

  billingBusinessName: z.string().max(254).optional(),
  billingRfc: z.string().max(13).optional(),
  billingRegime: z.string().optional(),
  billingCfdiUse: z.string().optional(),

  billingSameAsShipping: z.boolean(),

  billingAddress: addressSchema.optional(),

  items: z.array(orderItemSchema).min(1),
}).superRefine((data, ctx) => {
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
      message: "La dirección de facturación es obligatoria",
    });
  }
});

export type OrderInput = z.infer<typeof orderSchema>;