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

export default function CheckoutFailurePage() {
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
      <main className="min-h-screen bg-brand-background px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-brand-ink">
            No pudimos consultar tu pedido
          </h1>

          <p className="mt-4 text-brand-muted">
            Intenta nuevamente en unos momentos.
          </p>
        </div>
      </main>
    );
  }

  if (status === "PAID") {
    return (
      <main className="min-h-screen bg-brand-background px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-green-200 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-brand-ink">
            {fulfillmentStatus === "REVIEW_REQUIRED"
              ? "Pago confirmado; pedido en revisión"
              : "Pago confirmado"}
          </h1>

          <p className="mt-4 text-brand-muted">
            {fulfillmentStatus === "REVIEW_REQUIRED"
              ? "Estamos revisando la disponibilidad. Te avisaremos al correo registrado cuando haya existencias."
              : "Tu pago fue confirmado y tu pedido ha sido procesado."}
          </p>
        </div>
      </main>
    );
  }

  if (status === "CANCELLED") {
    return (
      <main className="min-h-screen bg-brand-background px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-brand-ink">
            Pago no completado
          </h1>

          <p className="mt-4 text-brand-muted">
            El pago no fue aprobado y el pedido fue cancelado.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-10 text-center">
        <h1 className="text-3xl font-bold text-brand-ink">
          Pago no completado
        </h1>

        <p className="mt-4 text-brand-muted">
          El pago no fue aprobado. Puedes intentarlo nuevamente.
        </p>
      </div>
    </main>
  );
}
