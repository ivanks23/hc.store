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
  const [submitted, setSubmitted] = useState(false);

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

  function onSubmit(data: CheckoutInput) {
    console.log("Checkout:", data);
    setSubmitted(true);
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Tu carrito está vacío
          </h1>

          <p className="mt-3 text-gray-600">
            Agrega productos antes de continuar con la compra.
          </p>

          <Link
            href="/catalog"
            className="mt-6 inline-block rounded-lg bg-black px-5 py-3 font-medium text-white"
          >
            Ir al catálogo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Finalizar compra
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* DATOS DEL CLIENTE */}

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Datos del cliente
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre
                  </label>

                  <input
                    {...register("customerName")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.customerName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Teléfono
                  </label>

                  <input
                    {...register("customerPhone")}
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.customerPhone && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.customerPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Correo electrónico
                  </label>

                  <input
                    {...register("customerEmail")}
                    type="email"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
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

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Dirección de envío
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Calle
                  </label>

                  <input
                    {...register("shippingAddress.street")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.street && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.street.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Número exterior
                  </label>

                  <input
                    {...register("shippingAddress.exteriorNumber")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.exteriorNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.exteriorNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Número interior
                    <span className="ml-1 text-gray-400">
                      (opcional)
                    </span>
                  </label>

                  <input
                    {...register("shippingAddress.interiorNumber")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Colonia
                  </label>

                  <input
                    {...register("shippingAddress.neighborhood")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.neighborhood && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.neighborhood.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Municipio / Alcaldía
                  </label>

                  <input
                    {...register("shippingAddress.municipality")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.municipality && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.municipality.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>

                  <select
                    {...register("shippingAddress.state")}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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
                  <label className="block text-sm font-medium text-gray-700">
                    Código postal
                  </label>

                  <input
                    {...register("shippingAddress.postalCode")}
                    inputMode="numeric"
                    maxLength={5}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />

                  {errors.shippingAddress?.postalCode && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.shippingAddress.postalCode.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Referencias
                    <span className="ml-1 text-gray-400">
                      (opcional)
                    </span>
                  </label>

                  <textarea
                    {...register("shippingAddress.references")}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>
            </section>

            {/* FACTURACIÓN */}

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Facturación
              </h2>

              <label className="mt-6 flex cursor-pointer items-center gap-3">
                <input
                  {...register("wantsInvoice")}
                  type="checkbox"
                  className="h-4 w-4"
                />

                <span className="text-sm text-gray-700">
                  Necesito factura
                </span>
              </label>

              {wantsInvoice && (
                <div className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Razón social
                    </label>

                    <input
                      {...register("billingBusinessName")}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 uppercase outline-none focus:border-black"
                    />

                    {errors.billingBusinessName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.billingBusinessName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      RFC
                    </label>

                    <input
                      {...register("billingRfc")}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 uppercase outline-none focus:border-black"
                    />

                    {errors.billingRfc && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.billingRfc.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Régimen fiscal
                    </label>

                    <select
                      {...register("billingRegime")}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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
                    <label className="block text-sm font-medium text-gray-700">
                      Uso de CFDI
                    </label>

                    <select
                      {...register("billingCfdiUse")}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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

                    <span className="text-sm text-gray-700">
                      Usar la misma dirección de envío para la factura
                    </span>
                  </label>

                  {!billingSameAsShipping && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                      <h3 className="font-medium text-gray-900">
                        Dirección fiscal
                      </h3>

                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Calle
                          </label>

                          <input
                            {...register("billingAddress.street")}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                          />

                          {errors.billingAddress?.street && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.billingAddress.street.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Número exterior
                          </label>

                          <input
                            {...register(
                              "billingAddress.exteriorNumber",
                            )}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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
                          <label className="block text-sm font-medium text-gray-700">
                            Número interior
                            <span className="ml-1 text-gray-400">
                              (opcional)
                            </span>
                          </label>

                          <input
                            {...register(
                              "billingAddress.interiorNumber",
                            )}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Colonia
                          </label>

                          <input
                            {...register(
                              "billingAddress.neighborhood",
                            )}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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
                          <label className="block text-sm font-medium text-gray-700">
                            Municipio / Alcaldía
                          </label>

                          <input
                            {...register(
                              "billingAddress.municipality",
                            )}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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
                          <label className="block text-sm font-medium text-gray-700">
                            Estado
                          </label>

                          <select
                            {...register("billingAddress.state")}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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
                          <label className="block text-sm font-medium text-gray-700">
                            Código postal
                          </label>

                          <input
                            {...register(
                              "billingAddress.postalCode",
                            )}
                            inputMode="numeric"
                            maxLength={5}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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
                          <label className="block text-sm font-medium text-gray-700">
                            Referencias
                            <span className="ml-1 text-gray-400">
                              (opcional)
                            </span>
                          </label>

                          <textarea
                            {...register(
                              "billingAddress.references",
                            )}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
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
              className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white"
            >
              Revisar pedido
            </button>

            {submitted && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
                Los datos del checkout son válidos.
              </div>
            )}
          </form>

          {/* RESUMEN */}

          <aside className="h-fit rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Resumen del pedido
            </h2>

            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex justify-between gap-4 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.name}
                    </p>

                    <p className="text-gray-500">
                      {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>

                  <p className="font-medium text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 text-lg font-bold">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            <Link
              href="/cart"
              className="mt-4 block text-center text-sm text-gray-600 hover:text-gray-900"
            >
              Volver al carrito
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}