"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  total: string;
  createdAt: string;
  items: {
    productName: string;
    quantity: number;
  }[];
};

const statusLabels: Record<Order["status"], string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

const statusClasses: Record<Order["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/orders");

        if (!response.ok) {
          throw new Error("No se pudieron consultar los pedidos.");
        }

        const data = await response.json();
        setOrders(data.orders);
      } catch (error) {
        console.error(error);
        setError("No se pudieron cargar tus pedidos.");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  async function continuePayment(orderId: string) {
    try {
      setPaymentLoading(orderId);
      setPaymentError("");

      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo iniciar el pago.",
        );
      }

      if (!data.initPoint) {
        throw new Error("Mercado Pago no devolvió una URL de pago.");
      }

      window.location.href = data.initPoint;
    } catch (error) {
      console.error(error);

      setPaymentError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar el pago.",
      );
      setPaymentLoading(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Mis pedidos</h1>
          <p className="mt-4 text-slate-600">Cargando pedidos...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Mis pedidos</h1>
          <p className="mt-4 text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Mis pedidos
          </h1>

          <p className="mt-2 text-slate-600">
            Consulta el estado y resumen de tus pedidos.
          </p>
        </div>

        {paymentError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {paymentError}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Todavía no tienes pedidos.
            </p>

            <Link
              href="/catalog"
              className="mt-4 inline-block font-medium text-slate-900 underline underline-offset-4"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Pedido
                    </p>

                    <p className="mt-1 font-mono text-sm text-slate-900">
                      {order.id}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString(
                        "es-MX",
                      )}
                    </p>
                  </div>

                  <div className="md:text-right">
                    <p className="text-sm font-medium text-slate-500">
                      Estado
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClasses[order.status]}`}
                    >
                      {statusLabels[order.status]}
                    </span>

                    <p className="mt-3 text-lg font-semibold text-slate-900">
                      $
                      {Number(order.total).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-sm font-medium text-slate-500">
                    Productos
                  </p>

                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <p
                        key={index}
                        className="text-sm text-slate-700"
                      >
                        {item.quantity} × {item.productName}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                  {order.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => continuePayment(order.id)}
                      disabled={paymentLoading === order.id}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {paymentLoading === order.id
                        ? "Preparando pago..."
                        : "Continuar con el pago"}
                    </button>
                  )}

                  <Link
                    href={`/account/orders/${order.id}`}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
