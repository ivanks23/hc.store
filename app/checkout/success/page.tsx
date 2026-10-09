"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useCartStore } from "@/lib/store/cart-store";

type OrderStatus = "PENDING" | "PAID" | "CANCELLED";
type FulfillmentStatus = "NOT_REQUIRED" | "REVIEW_REQUIRED";

type OrderResponse = {
  order: {
    id: string;
    status: OrderStatus;
    fulfillmentStatus: FulfillmentStatus;
    total: string;
  };
};

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const clearCart = useCartStore((state) => state.clearCart);

  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [fulfillmentStatus, setFulfillmentStatus] =
    useState<FulfillmentStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let cancelled = false;

    const checkOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudo consultar el pedido");
        }

        const data: OrderResponse = await response.json();

        if (cancelled) return;

        setStatus(data.order.status);
        setFulfillmentStatus(data.order.fulfillmentStatus);

        if (data.order.status === "PAID") {
          clearCart();
          return;
        }

        if (data.order.status === "PENDING") {
          setTimeout(checkOrder, 2000);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    };

    checkOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, clearCart]);

  if (!orderId || error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">No pudimos confirmar tu pedido</h1>
          <p className="mt-3 text-brand-muted">
            Intenta consultar nuevamente en unos momentos.
          </p>
        </div>
      </main>
    );
  }

  if (status === "PAID") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">✓</div>

          {fulfillmentStatus === "REVIEW_REQUIRED" ? (
            <>
              <h1 className="text-3xl font-bold">Pago confirmado; pedido en revisión</h1>
              <p className="mt-3 text-brand-muted">
                Estamos revisando la disponibilidad. Te avisaremos al correo registrado cuando haya existencias.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold">Pago confirmado</h1>
              <p className="mt-3 text-brand-muted">
                Tu pago fue procesado correctamente y tu pedido ha sido confirmado.
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  if (status === "CANCELLED") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">La reserva venció</h1>
          <p className="mt-3 text-brand-muted">
            El pedido no se confirmó. Regresa a la tienda para iniciar una compra nueva.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">⏳</div>

        <h1 className="text-3xl font-bold">
          Confirmando tu pago
        </h1>

        <p className="mt-3 text-brand-muted">
          Estamos esperando la confirmación de Mercado Pago.
        </p>
      </div>
    </main>
  );
}
