"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";

import { useCartStore } from "@/lib/store/cart-store";
import {
  cfdiRegimes,
  cfdiUses,
  mexicanStates,
} from "@/lib/constants/cfdi";
import {
  checkoutSchema,
  type CheckoutInput,
} from "@/lib/validations/checkout";

export default function CheckoutPage() {
  const { data: session } = useSession();

  const items = useCartStore((state) => state.items);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      wantsInvoice: false,
      billingSameAsShipping: true,
    },
  });

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    reset((currentValues) => ({
      ...currentValues,
      customerName: session.user.name ?? "",
      customerEmail: session.user.email ?? "",
    }));
  }, [session, reset]);

  const wantsInvoice = watch("wantsInvoice");
  const billingSameAsShipping = watch("billingSameAsShipping");

async function onSubmit(data: CheckoutInput) {
  setIsSubmitting(true);
  setSubmitError(null);

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        items: items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "No se pudo crear el pedido");
    }

    const paymentResponse = await fetch(
      `/api/orders/${result.order.id}/payment`,
      {
        method: "POST",
      },
    );

    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok) {
      throw new Error(
        paymentResult.error ?? "No se pudo iniciar el pago",
      );
    }

    window.location.assign(paymentResult.initPoint);
  } catch (error) {
    setSubmitError(
      error instanceof Error
        ? error.message
        : "No se pudo procesar el pedido",
    );
  } finally {
    setIsSubmitting(false);
  }
}

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-brand-background px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-brand-border bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-brand-ink">
            Tu carrito está vacío
          </h1>

          <p className="mt-3 text-brand-muted">
            Agrega productos antes de continuar con la compra.
          </p>

          <Link
            href="/catalog"
            className="mt-6 inline-block rounded-lg bg-brand-ink px-5 py-3 font-medium text-white"
          >
            Ir al catálogo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-brand-ink">
          Finalizar compra
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* DATOS DEL CLIENTE */}

            <section className="rounded-xl border border-brand-border bg-white p-6">
              <h2 className="text-xl font-semibold text-brand-ink">
                Datos del cliente
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Nombre
                  </label>

                  <input
                    {...register("customerName")}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.customerName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Teléfono
                  </label>

                  <input
                    {...register("customerPhone")}
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.customerPhone && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.customerPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Correo electrónico
                  </label>

                  <input
                    {...register("customerEmail")}
                    type="email"
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.customerEmail && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.customerEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* DIRECCIÓN DE ENVÍO */}

            <section className="rounded-xl border border-brand-border bg-white p-6">
              <h2 className="text-xl font-semibold text-brand-ink">
                Dirección de envío
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-brand-secondary">
                    Calle
                  </label>

                  <input
                    {...register("shippingAddress.street")}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.street && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.street.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Número exterior
                  </label>

                  <input
                    {...register("shippingAddress.exteriorNumber")}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.exteriorNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.exteriorNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Número interior
                    <span className="ml-1 text-brand-placeholder">
                      (opcional)
                    </span>
                  </label>

                  <input
                    {...register("shippingAddress.interiorNumber")}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Colonia
                  </label>

                  <input
                    {...register("shippingAddress.neighborhood")}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.neighborhood && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.neighborhood.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Municipio / Alcaldía
                  </label>

                  <input
                    {...register("shippingAddress.municipality")}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.municipality && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.municipality.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Estado
                  </label>

                  <select
                    {...register("shippingAddress.state")}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                  >
                    <option value="">Selecciona un estado</option>

                    {mexicanStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>

                  {errors.shippingAddress?.state && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.state.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-secondary">
                    Código postal
                  </label>

                  <input
                    {...register("shippingAddress.postalCode")}
                    inputMode="numeric"
                    maxLength={5}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.postalCode && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.postalCode.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-brand-secondary">
                    Referencias
                    <span className="ml-1 text-brand-placeholder">
                      (opcional)
                    </span>
                  </label>

                  <textarea
                    {...register("shippingAddress.references")}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>
            </section>

            {/* FACTURACIÓN */}

            <section className="rounded-xl border border-brand-border bg-white p-6">
              <h2 className="text-xl font-semibold text-brand-ink">
                Facturación
              </h2>

              <label className="mt-6 flex cursor-pointer items-center gap-3">
                <input
                  {...register("wantsInvoice")}
                  type="checkbox"
                  className="h-4 w-4"
                />

                <span className="text-sm text-brand-secondary">
                  Necesito factura
                </span>
              </label>

              {wantsInvoice && (
                <div className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary">
                      Razón social
                    </label>

                    <input
                      {...register("billingBusinessName")}
                      className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 uppercase outline-none focus:border-black"
                    />

                    {errors.billingBusinessName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.billingBusinessName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-secondary">
                      RFC
                    </label>

                    <input
                      {...register("billingRfc")}
                      className="mt-1 w-full rounded-lg border border-brand-border-strong px-4 py-3 uppercase outline-none focus:border-black"
                    />

                    {errors.billingRfc && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.billingRfc.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-secondary">
                      Régimen fiscal
                    </label>

                    <select
                      {...register("billingRegime")}
                      className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                    >
                      <option value="">
                        Selecciona tu régimen fiscal
                      </option>

                      {cfdiRegimes.map((regime) => (
                        <option key={regime.code} value={regime.code}>
                          {regime.code} — {regime.name}
                        </option>
                      ))}
                    </select>

                    {errors.billingRegime && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.billingRegime.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-secondary">
                      Uso de CFDI
                    </label>

                    <select
                      {...register("billingCfdiUse")}
                      className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                    >
                      <option value="">
                        Selecciona el uso de CFDI
                      </option>

                      {cfdiUses.map((use) => (
                        <option key={use.code} value={use.code}>
                          {use.code} — {use.name}
                        </option>
                      ))}
                    </select>

                    {errors.billingCfdiUse && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.billingCfdiUse.message}
                      </p>
                    )}
                  </div>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      {...register("billingSameAsShipping")}
                      type="checkbox"
                      className="h-4 w-4"
                    />

                    <span className="text-sm text-brand-secondary">
                      Usar la misma dirección de envío para la factura
                    </span>
                  </label>

                  {!billingSameAsShipping && (
                    <div className="rounded-lg border border-brand-border bg-brand-background p-5">
                      <h3 className="font-medium text-brand-ink">
                        Dirección fiscal
                      </h3>

                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-brand-secondary">
                            Calle
                          </label>

                          <input
                            {...register("billingAddress.street")}
                            className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                          />

                          {errors.billingAddress?.street && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.billingAddress.street.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-brand-secondary">
                            Número exterior
                          </label>

                          <input
                            {...register(
                              "billingAddress.exteriorNumber",
                            )}
                            className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                          />

                          {errors.billingAddress?.exteriorNumber && (
                            <p className="mt-1 text-sm text-red-600">
                              {
                                errors.billingAddress.exteriorNumber
                                  .message
                              }
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-brand-secondary">
                            Número interior
                            <span className="ml-1 text-brand-placeholder">
                              (opcional)
                            </span>
                          </label>

                          <input
                            {...register(
                              "billingAddress.interiorNumber",
                            )}
                            className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-brand-secondary">
                            Colonia
                          </label>

                          <input
                            {...register(
                              "billingAddress.neighborhood",
                            )}
                            className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                          />

                          {errors.billingAddress?.neighborhood && (
                            <p className="mt-1 text-sm text-red-600">
                              {
                                errors.billingAddress.neighborhood
                                  .message
                              }
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-brand-secondary">
                            Municipio / Alcaldía
                          </label>

                          <input
                            {...register(
                              "billingAddress.municipality",
                            )}
                            className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                          />

                          {errors.billingAddress?.municipality && (
                            <p className="mt-1 text-sm text-red-600">
                              {
                                errors.billingAddress.municipality
                                  .message
                              }
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-brand-secondary">
                            Estado
                          </label>

                          <select
                            {...register("billingAddress.state")}
                            className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                          >
                            <option value="">
                              Selecciona un estado
                            </option>

                            {mexicanStates.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>

                          {errors.billingAddress?.state && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.billingAddress.state.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-brand-secondary">
                            Código postal
                          </label>

                          <input
                            {...register(
                              "billingAddress.postalCode",
                            )}
                            inputMode="numeric"
                            maxLength={5}
                            className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                          />

                          {errors.billingAddress?.postalCode && (
                            <p className="mt-1 text-sm text-red-600">
                              {
                                errors.billingAddress.postalCode
                                  .message
                              }
                            </p>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-brand-secondary">
                            Referencias
                            <span className="ml-1 text-brand-placeholder">
                              (opcional)
                            </span>
                          </label>

                          <textarea
                            {...register(
                              "billingAddress.references",
                            )}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-brand-border-strong bg-white px-4 py-3 outline-none focus:border-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand-ink px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creando pedido..." : "Revisar pedido"}
            </button>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                {submitError}
              </div>
            )}

          </form>

          {/* RESUMEN */}

          <aside className="h-fit rounded-xl border border-brand-border bg-white p-6">
            <h2 className="text-xl font-semibold text-brand-ink">
              Resumen del pedido
            </h2>

            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex justify-between gap-4 text-sm"
                >
                  <div>
                    <p className="font-medium text-brand-ink">
                      {item.name}
                    </p>

                    <p className="text-brand-text-subtle">
                      {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>

                  <p className="font-medium text-brand-ink">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-4 text-lg font-bold">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            <Link
              href="/cart"
              className="mt-4 block text-center text-sm text-brand-muted hover:text-brand-ink"
            >
              Volver al carrito
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
