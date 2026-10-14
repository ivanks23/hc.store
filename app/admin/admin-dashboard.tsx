"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type InventoryVariant = {
  id: string;
  sku: string;
  price: string;
  productName: string;
  attributes: string[];
  physicalStock: number;
  availableStock: number;
};

type ReviewOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: string;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    variantId: string;
  }[];
};

type DeliveryStatus = "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED";

type AdminOrder = {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  fulfillmentStatus: "NOT_REQUIRED" | "REVIEW_REQUIRED";
  deliveryStatus: DeliveryStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingExteriorNumber: string;
  shippingInteriorNumber: string | null;
  shippingNeighborhood: string;
  shippingMunicipality: string;
  shippingState: string;
  shippingPostalCode: string;
  total: string;
  createdAt: string;
  items: { productName: string; sku: string; quantity: number }[];
  payments: { mercadoPagoId: string; status: string; paymentType: string | null }[];
};

type MovementType = "PURCHASE" | "ADJUSTMENT" | "RETURN";

type MovementAction = "PURCHASE" | "RETURN" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

type InventoryMovement = {
  id: string;
  type: MovementType | "SALE";
  quantity: number;
  reason: string | null;
  createdAt: string;
  sku: string;
  productName: string;
};

const movementLabels: Record<MovementType, string> = {
  PURCHASE: "Reposición",
  ADJUSTMENT: "Ajuste",
  RETURN: "Devolución",
};

const movementActions: Record<MovementAction, string> = {
  PURCHASE: "Reposición: sumar existencias",
  RETURN: "Devolución: sumar existencias",
  ADJUSTMENT_IN: "Ajuste: sumar existencias",
  ADJUSTMENT_OUT: "Ajuste: retirar existencias",
};

const historyLabels: Record<InventoryMovement["type"], string> = {
  ...movementLabels,
  SALE: "Venta",
};

const deliveryLabels: Record<DeliveryStatus, string> = {
  PENDING: "Pendiente de preparar",
  PREPARING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
};

export default function AdminDashboard() {
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [reviewOrders, setReviewOrders] = useState<ReviewOrder[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [movementAction, setMovementAction] = useState<MovementAction>("PURCHASE");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingOrderId, setResolvingOrderId] = useState<string | null>(null);
  const [updatingDeliveryOrderId, setUpdatingDeliveryOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedVariantId, variants],
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [inventoryResponse, reviewsResponse, ordersResponse] = await Promise.all([
        fetch("/api/admin/inventory", { cache: "no-store" }),
        fetch("/api/admin/orders/review", { cache: "no-store" }),
        fetch("/api/admin/orders", { cache: "no-store" }),
      ]);
      const inventoryData = await inventoryResponse.json();
      const reviewsData = await reviewsResponse.json();
      const ordersData = await ordersResponse.json();

      if (!inventoryResponse.ok) {
        throw new Error(inventoryData.error ?? "No se pudo cargar el inventario");
      }
      if (!reviewsResponse.ok) {
        throw new Error(reviewsData.error ?? "No se pudieron cargar los pedidos");
      }
      if (!ordersResponse.ok) {
        throw new Error(ordersData.error ?? "No se pudieron cargar los pedidos");
      }

      setVariants(inventoryData.variants);
      setMovements(inventoryData.movements);
      setReviewOrders(reviewsData.orders);
      setOrders(ordersData.orders);
      setSelectedVariantId((current) => current || inventoryData.variants[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "No se pudo cargar el panel",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleInventorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const enteredQuantity = Number(quantity);
    const parsedQuantity =
      movementAction === "ADJUSTMENT_OUT"
        ? -Math.abs(enteredQuantity)
        : Math.abs(enteredQuantity);
    const movementType: MovementType =
      movementAction === "PURCHASE"
        ? "PURCHASE"
        : movementAction === "RETURN"
          ? "RETURN"
          : "ADJUSTMENT";
    if (!selectedVariantId || !Number.isInteger(parsedQuantity) || parsedQuantity === 0) {
      setError("Selecciona una variante e ingresa una cantidad entera distinta de cero.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selectedVariantId,
          type: movementType,
          quantity: parsedQuantity,
          reason,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo registrar el movimiento");
      }

      setMessage("Movimiento registrado. Las existencias ya se actualizaron.");
      setQuantity("1");
      setReason("");
      await loadDashboard();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar el movimiento",
      );
    } finally {
      setSaving(false);
    }
  }

  async function resolveReviewOrder(orderId: string) {
    setMessage(null);
    setError(null);
    setResolvingOrderId(orderId);

    try {
      const response = await fetch("/api/admin/orders/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo resolver el pedido");
      }

      setMessage("Pedido resuelto y salida de inventario registrada.");
      await loadDashboard();
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : "No se pudo resolver el pedido",
      );
    } finally {
      setResolvingOrderId(null);
    }
  }

  async function updateDeliveryStatus(orderId: string, deliveryStatus: DeliveryStatus) {
    setMessage(null);
    setError(null);
    setUpdatingDeliveryOrderId(orderId);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, deliveryStatus }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar la entrega");
      }

      setMessage("Estado de entrega actualizado.");
      await loadDashboard();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar la entrega",
      );
    } finally {
      setUpdatingDeliveryOrderId(null);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-brand-background px-5 py-12"><p className="mx-auto max-w-6xl text-brand-muted">Cargando administración…</p></main>;
  }

  return (
    <main className="min-h-screen bg-brand-background px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Operación interna</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-ink">Inventario y revisiones</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">Registra reposiciones y libera pedidos pagados cuando vuelvan a estar cubiertos por existencias.</p>
          </div>
          <button type="button" onClick={loadDashboard} className="rounded-lg border border-brand-border-strong bg-white px-4 py-2 text-sm font-semibold text-brand-secondary">Actualizar datos</button>
          <Link href="/admin/catalog" className="rounded-lg bg-brand-ink px-4 py-2 text-sm font-semibold text-white">Administrar catálogo</Link>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div>}
        {message && <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">{message}</div>}

        <section className="mt-8 rounded-2xl border border-brand-border bg-white p-6">
          <h2 className="text-xl font-semibold text-brand-ink">Registrar movimiento</h2>
          <p className="mt-1 text-sm text-brand-muted">Usa reposición para entradas de proveedor, devolución para artículos recuperados y ajuste para correcciones positivas o negativas.</p>

          <form onSubmit={handleInventorySubmit} className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] lg:items-end">
            <label className="block text-sm font-medium text-brand-secondary">Variante
              <select value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2 text-brand-ink">
                {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.productName} · {variant.sku}{variant.attributes.length ? ` · ${variant.attributes.join(", ")}` : ""}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-brand-secondary">Tipo
              <select value={movementAction} onChange={(event) => setMovementAction(event.target.value as MovementAction)} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2 text-brand-ink">
                {Object.entries(movementActions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-brand-secondary">Cantidad
              <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min="1" step="1" required className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2 text-brand-ink" />
            </label>
            <label className="block text-sm font-medium text-brand-secondary">Motivo
              <input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={240} required placeholder="Ej. Reposición proveedor octubre" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2 text-brand-ink" />
            </label>
            <button type="submit" disabled={saving || !selectedVariant} className="rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Guardando…" : "Registrar"}</button>
          </form>

          {selectedVariant && <p className="mt-4 text-sm text-brand-muted">Existencia física: <strong className="text-brand-ink">{selectedVariant.physicalStock}</strong> · Disponible para venta: <strong className="text-brand-ink">{selectedVariant.availableStock}</strong></p>}
        </section>

        <section className="mt-8 rounded-2xl border border-brand-border bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
            <h2 className="text-xl font-semibold text-brand-ink">Historial de movimientos</h2>
            <p className="mt-1 text-sm text-brand-muted">Últimos 50 registros, incluidas reposiciones, ajustes, devoluciones y ventas.</p>
            </div>
            <Link href="/admin/inventory" className="text-sm font-semibold text-brand-secondary hover:text-brand-ink">Ver historial completo →</Link>
          </div>
          {movements.length === 0 ? (
            <p className="mt-5 text-sm text-brand-muted">Aún no hay movimientos registrados.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-text-subtle">
                  <tr><th className="pb-3 pr-4">Fecha</th><th className="pb-3 pr-4">Producto</th><th className="pb-3 pr-4">Tipo</th><th className="pb-3 pr-4">Cantidad</th><th className="pb-3">Motivo</th></tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {movements.map((movement) => <tr key={movement.id}>
                    <td className="py-3 pr-4 whitespace-nowrap text-brand-muted">{new Date(movement.createdAt).toLocaleString("es-MX")}</td>
                    <td className="py-3 pr-4 text-brand-secondary">{movement.productName} <span className="text-brand-text-subtle">({movement.sku})</span></td>
                    <td className="py-3 pr-4 text-brand-secondary">{historyLabels[movement.type]}</td>
                    <td className={`py-3 pr-4 font-semibold ${movement.quantity > 0 ? "text-green-700" : "text-red-700"}`}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</td>
                    <td className="py-3 text-brand-muted">{movement.reason ?? "—"}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand-ink">Pedidos pagados en revisión</h2>
              <p className="mt-1 text-sm text-brand-muted">Tras registrar la reposición, resuelve el pedido para registrar su salida y retirarlo de esta lista.</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">{reviewOrders.length} pendientes</span>
          </div>

          {reviewOrders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-brand-border bg-white p-7 text-sm text-brand-muted">No hay pedidos que requieran revisión de inventario.</div>
          ) : (
            <div className="mt-4 space-y-4">
              {reviewOrders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-amber-200 bg-white p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-xs text-brand-text-subtle">{order.id}</p>
                      <h3 className="mt-2 font-semibold text-brand-ink">{order.customerName}</h3>
                      <p className="mt-1 text-sm text-brand-muted">{order.customerEmail} · {order.customerPhone}</p>
                      <p className="mt-1 text-sm text-brand-muted">${Number(order.total).toFixed(2)} · {new Date(order.createdAt).toLocaleDateString("es-MX")}</p>
                    </div>
                    <button type="button" onClick={() => resolveReviewOrder(order.id)} disabled={resolvingOrderId === order.id} className="rounded-lg bg-brand-ink px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{resolvingOrderId === order.id ? "Resolviendo…" : "Resolver pedido"}</button>
                  </div>
                  <ul className="mt-5 divide-y divide-brand-border border-y border-brand-border text-sm">
                    {order.items.map((item) => <li key={item.id} className="flex justify-between gap-4 py-3 text-brand-secondary"><span>{item.productName} <span className="text-brand-text-subtle">({item.sku})</span></span><strong className="text-brand-ink">{item.quantity} u.</strong></li>)}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-brand-border bg-white p-6">
          <div>
            <h2 className="text-xl font-semibold text-brand-ink">Pedidos recientes</h2>
            <p className="mt-1 text-sm text-brand-muted">Gestiona la preparación y entrega de los últimos 50 pedidos.</p>
          </div>
          {orders.length === 0 ? (
            <p className="mt-5 text-sm text-brand-muted">Aún no hay pedidos registrados.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {orders.map((order) => {
                const payment = order.payments[0];
                const address = `${order.shippingStreet} ${order.shippingExteriorNumber}${order.shippingInteriorNumber ? ` Int. ${order.shippingInteriorNumber}` : ""}, ${order.shippingNeighborhood}, ${order.shippingMunicipality}, ${order.shippingState}, C.P. ${order.shippingPostalCode}`;
                return <article key={order.id} className="rounded-xl border border-brand-border p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-mono text-xs text-brand-text-subtle">{order.id}</p>
                      <h3 className="mt-2 font-semibold text-brand-ink">{order.customerName}</h3>
                      <p className="mt-1 text-sm text-brand-muted">{order.customerEmail} · {order.customerPhone}</p>
                      <p className="mt-1 max-w-3xl text-sm text-brand-muted">{address}</p>
                      <p className="mt-2 text-sm text-brand-secondary">${Number(order.total).toFixed(2)} · {new Date(order.createdAt).toLocaleString("es-MX")}</p>
                      <p className="mt-1 text-xs text-brand-text-subtle">Pago: {payment ? `${payment.status}${payment.paymentType ? ` · ${payment.paymentType}` : ""} · ${payment.mercadoPagoId}` : "Sin pago registrado"}</p>
                    </div>
                    {order.status === "PAID" ? (
                      <label className="block text-sm font-medium text-brand-secondary">Entrega
                        <select value={order.deliveryStatus} disabled={updatingDeliveryOrderId === order.id} onChange={(event) => updateDeliveryStatus(order.id, event.target.value as DeliveryStatus)} className="mt-1 block rounded-lg border border-brand-border-strong bg-white px-3 py-2 text-brand-ink disabled:opacity-50">
                          {Object.entries(deliveryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                    ) : <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Pago {order.status.toLowerCase()}</span>}
                  </div>
                  <ul className="mt-4 divide-y divide-brand-border border-y border-brand-border text-sm">
                    {order.items.map((item) => <li key={`${order.id}-${item.sku}`} className="flex justify-between gap-4 py-2.5 text-brand-secondary"><span>{item.productName} <span className="text-brand-text-subtle">({item.sku})</span></span><strong className="text-brand-ink">{item.quantity} u.</strong></li>)}
                  </ul>
                </article>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
