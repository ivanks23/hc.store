"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useCartStore } from "@/lib/store/cart-store";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore(
    (state) => state.updateQuantity,
  );
  const clearCart = useCartStore((state) => state.clearCart);
  const setItems = useCartStore((state) => state.setItems);

  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(
    null,
  );

  const cartKey = items
    .map((item) => `${item.variantId}:${item.quantity}`)
    .join("|");

  useEffect(() => {
    if (items.length === 0) {
      setIsValidating(false);
      return;
    }

    let cancelled = false;

    async function validateCart() {
      setIsValidating(true);
      setValidationError(null);

      try {
        const response = await fetch("/api/cart/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ?? "No se pudo validar el carrito",
          );
        }

        if (cancelled) {
          return;
        }

        const validatedItems = data.items.map(
          (item: {
            variantId: string;
            productId: string;
            name: string;
            price: string;
            image: string | null;
            quantity: number;
          }) => ({
            variantId: item.variantId,
            productId: item.productId,
            name: item.name,
            price: Number(item.price),
            image: item.image,
            quantity: item.quantity,
          }),
        );

        setItems(validatedItems);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setValidationError(
          error instanceof Error
            ? error.message
            : "No se pudo validar el carrito",
        );
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    }

    validateCart();

    return () => {
      cancelled = true;
    };
  }, [cartKey, setItems]);

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (isValidating) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-600">Validando tu carrito...</p>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Tu carrito está vacío
          </h1>

          <p className="mt-3 text-gray-600">
            Agrega productos desde nuestro catálogo.
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Carrito
          </h1>

          <button
            type="button"
            onClick={clearCart}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Vaciar carrito
          </button>
        </div>

        {validationError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {validationError}
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.variantId}
              className="flex gap-5 rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {item.name}
                  </h2>

                  <p className="mt-1 text-gray-600">
                    ${item.price.toFixed(2)} c/u
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.variantId,
                        item.quantity - 1,
                      )
                    }
                    className="h-8 w-8 rounded border border-gray-300"
                  >
                    −
                  </button>

                  <span className="min-w-6 text-center">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.variantId,
                        item.quantity + 1,
                      )
                    }
                    className="h-8 w-8 rounded border border-gray-300"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="ml-3 text-sm text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <p className="font-semibold text-gray-900">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button
            type="button"
            className="mt-6 w-full rounded-lg bg-black px-5 py-3 font-medium text-white"
          >
            Continuar con la compra
          </button>
        </div>
      </div>
    </main>
  );
}