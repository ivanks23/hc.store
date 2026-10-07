"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

type OrderResponse = {
  order: {
    id: string;
    status: OrderStatus;
    total: string;
  };
};

export default function CheckoutPendingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError(true);
      return;
    }

    let cancelled = false;

    const checkOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudo consultar el pedido");
        }

        const data: OrderResponse = await response.json();

        if (cancelled) return;

        setStatus(data.order.status);

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
  }, [orderId]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            No pudimos consultar tu pedido
          </h1>

          <p className="mt-4 text-gray-600">
            Intenta nuevamente en unos momentos.
          </p>
        </div>
      </main>
    );
  }

  if (status === "PAID") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-green-200 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Pago confirmado
          </h1>

          <p className="mt-4 text-gray-600">
            Tu pago fue confirmado y tu pedido ha sido procesado.
          </p>
        </div>
      </main>
    );
  }

  if (status === "CANCELLED") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-white p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Pedido cancelado
          </h1>

          <p className="mt-4 text-gray-600">
            El pedido no pudo completarse.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-yellow-200 bg-white p-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Pago pendiente
        </h1>

        <p className="mt-4 text-gray-600">
          Estamos esperando la confirmación de Mercado Pago.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Esta página se actualizará automáticamente.
        </p>
      </div>
    </main>
  );
}