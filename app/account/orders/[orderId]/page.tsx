"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Order = {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  total: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;

  shippingStreet: string;
  shippingExteriorNumber: string;
  shippingInteriorNumber: string | null;
  shippingNeighborhood: string;
  shippingMunicipality: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingReferences: string | null;

  wantsInvoice: boolean;
  billingBusinessName: string | null;
  billingRfc: string | null;
  billingRegime: string | null;
  billingCfdiUse: string | null;
  billingStreet: string | null;
  billingExteriorNumber: string | null;
  billingInteriorNumber: string | null;
  billingNeighborhood: string | null;
  billingMunicipality: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingReferences: string | null;

  createdAt: string;

  items: {
    productName: string;
    sku: string;
    unitPrice: string;
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

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      try {
        const response = await fetch(`/api/orders/${orderId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Pedido no encontrado.");
          }

          throw new Error("No se pudo consultar el pedido.");
        }

        const data = await response.json();

        setOrder({
          ...data.order,
          createdAt: data.order.createdAt,
        });
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el pedido.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-600">Cargando pedido...</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/account/orders"
            className="text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            ← Volver a mis pedidos
          </Link>

          <div className="mt-8 rounded-xl border border-red-200 bg-white p-8">
            <h1 className="text-xl font-semibold">
              No se pudo cargar el pedido
            </h1>

            <p className="mt-2 text-red-600">
              {error || "Pedido no encontrado."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/account/orders"
          className="text-sm font-medium text-slate-700 underline underline-offset-4"
        >
          ← Volver a mis pedidos
        </Link>

        <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Detalle del pedido
            </p>

            <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">
              {order.id}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Realizado el {formatDate(order.createdAt)}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${statusClasses[order.status]}`}
          >
            {statusLabels[order.status]}
          </span>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Cliente</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Nombre</p>
                <p className="font-medium">{order.customerName}</p>
              </div>

              <div>
                <p className="text-slate-500">Correo electrónico</p>
                <p className="font-medium">{order.customerEmail}</p>
              </div>

              <div>
                <p className="text-slate-500">Teléfono</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Resumen</h2>

            <div className="mt-4">
              <p className="text-sm text-slate-500">Total del pedido</p>

              <p className="mt-1 text-2xl font-bold">
                ${formatCurrency(order.total)}
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Dirección de envío</h2>

          <div className="mt-4 space-y-1 text-sm text-slate-700">
            <p>
              {order.shippingStreet} #{order.shippingExteriorNumber}
              {order.shippingInteriorNumber
                ? `, Int. ${order.shippingInteriorNumber}`
                : ""}
            </p>

            <p>{order.shippingNeighborhood}</p>

            <p>
              {order.shippingMunicipality}, {order.shippingState}
            </p>

            <p>C.P. {order.shippingPostalCode}</p>

            {order.shippingReferences && (
              <div className="pt-3">
                <p className="text-slate-500">Referencias</p>
                <p>{order.shippingReferences}</p>
              </div>
            )}
          </div>
        </section>

        {order.wantsInvoice && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Datos de facturación</h2>

            <div className="mt-4 grid gap-5 text-sm md:grid-cols-2">
              <div>
                <p className="text-slate-500">Razón social</p>
                <p className="font-medium">
                  {order.billingBusinessName}
                </p>
              </div>

              <div>
                <p className="text-slate-500">RFC</p>
                <p className="font-medium">{order.billingRfc}</p>
              </div>

              <div>
                <p className="text-slate-500">Régimen fiscal</p>
                <p className="font-medium">{order.billingRegime}</p>
              </div>

              <div>
                <p className="text-slate-500">Uso de CFDI</p>
                <p className="font-medium">{order.billingCfdiUse}</p>
              </div>

              <div className="md:col-span-2">
                <p className="text-slate-500">Domicilio fiscal</p>

                <div className="mt-1 text-slate-700">
                  <p>
                    {order.billingStreet} #{order.billingExteriorNumber}
                    {order.billingInteriorNumber
                      ? `, Int. ${order.billingInteriorNumber}`
                      : ""}
                  </p>

                  <p>{order.billingNeighborhood}</p>

                  <p>
                    {order.billingMunicipality}, {order.billingState}
                  </p>

                  <p>C.P. {order.billingPostalCode}</p>

                  {order.billingReferences && (
                    <p className="mt-2">
                      Referencias: {order.billingReferences}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Productos</h2>

          <div className="mt-5 divide-y divide-slate-200">
            {order.items.map((item) => {
              const subtotal = Number(item.unitPrice) * item.quantity;

              return (
                <div
                  key={item.sku}
                  className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.productName}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      SKU: {item.sku}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.quantity} × ${formatCurrency(item.unitPrice)}
                    </p>
                  </div>

                  <p className="font-semibold text-slate-900">
                    ${formatCurrency(subtotal)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-600">Total</span>

              <span className="text-xl font-bold">
                ${formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}