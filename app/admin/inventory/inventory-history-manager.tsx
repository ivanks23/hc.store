"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type MovementType = "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN";
type Movement = {
  id: string;
  type: MovementType;
  quantity: number;
  reason: string | null;
  createdAt: string;
  variantId: string;
  sku: string;
  productName: string;
  orderId: string | null;
};
type Filters = { search: string; type: string; from: string; to: string };
type HistoryResponse = { movements: Movement[]; page: number; pageSize: number; total: number; totalPages: number };

const typeLabels: Record<MovementType, string> = {
  PURCHASE: "Entrada",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  RETURN: "Devolución",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

export default function InventoryHistoryManager() {
  const [form, setForm] = useState<Filters>({ search: "", type: "", from: "", to: "" });
  const [filters, setFilters] = useState<Filters>({ search: "", type: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (filters.search) params.set("search", filters.search);
    if (filters.type) params.set("type", filters.type);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    fetch(`/api/admin/inventory/history?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "No se pudo cargar el historial");
        setData(result as HistoryResponse);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, page]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.from && form.to && form.from > form.to) {
      setFilterError("La fecha inicial debe ser anterior o igual a la fecha final.");
      return;
    }
    setLoading(true);
    setError("");
    setFilterError("");
    setPage(1);
    setFilters({ ...form, search: form.search.trim() });
  }

  function clearFilters() {
    const emptyFilters = { search: "", type: "", from: "", to: "" };
    setForm(emptyFilters);
    setFilters(emptyFilters);
    setLoading(true);
    setError("");
    setFilterError("");
    setPage(1);
  }

  const firstRecord = data && data.total > 0 ? (page - 1) * data.pageSize + 1 : 0;
  const lastRecord = data ? Math.min(page * data.pageSize, data.total) : 0;

  return (
    <main className="min-h-screen bg-brand-background px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-green">Operación interna</p>
            <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Historial de inventario</h1>
            <p className="mt-2 text-sm text-brand-muted">Consulta entradas, ventas, ajustes y devoluciones de cada variante.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="rounded-lg border border-brand-border-strong bg-white px-4 py-2 text-sm font-semibold text-brand-secondary">← Administración</Link>
            <Link href="/admin/catalog" className="rounded-lg bg-brand-ink px-4 py-2 text-sm font-semibold text-white">Catálogo</Link>
          </div>
        </div>

        <form onSubmit={applyFilters} className="mt-7 grid gap-4 rounded-2xl border border-brand-border bg-white p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="text-sm font-medium text-brand-secondary lg:col-span-2">Producto o SKU
            <input type="search" value={form.search} onChange={(event) => setForm({ ...form, search: event.target.value })} placeholder="Ej. Monitor ASUS o SKU-123" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-brand-secondary">Tipo de movimiento
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2">
              <option value="">Todos</option>
              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-brand-secondary">Desde
            <input type="date" value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-brand-secondary">Hasta
            <input type="date" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2" />
          </label>
          <div className="flex flex-wrap gap-3 lg:col-span-5">
            <button type="submit" className="rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-bold text-white">Aplicar filtros</button>
            <button type="button" onClick={clearFilters} className="rounded-lg border border-brand-border-strong px-4 py-2.5 text-sm font-semibold text-brand-secondary">Limpiar</button>
          </div>
          {filterError && <p className="text-sm text-red-700 lg:col-span-5" role="alert">{filterError}</p>}
        </form>

        <section className="mt-7 rounded-2xl border border-brand-border bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-brand-ink">Movimientos</h2>
            <p className="text-sm text-brand-muted">{loading ? "Actualizando…" : data ? `${firstRecord}–${lastRecord} de ${data.total}` : ""}</p>
          </div>
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
          {!error && !loading && data?.movements.length === 0 && <p className="mt-5 rounded-lg bg-brand-background p-6 text-center text-sm text-brand-muted">No hay movimientos que coincidan con estos filtros.</p>}
          {data && data.movements.length > 0 && <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-text-subtle">
                <tr><th className="pb-3 pr-4">Fecha</th><th className="pb-3 pr-4">Producto / variante</th><th className="pb-3 pr-4">Tipo</th><th className="pb-3 pr-4">Cantidad</th><th className="pb-3 pr-4">Motivo</th><th className="pb-3">Pedido</th></tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {data.movements.map((movement) => <tr key={movement.id}>
                  <td className="whitespace-nowrap py-3 pr-4 text-brand-muted">{formatDate(movement.createdAt)}</td>
                  <td className="py-3 pr-4 text-brand-secondary"><span className="font-medium text-brand-ink">{movement.productName}</span><span className="block text-xs text-brand-text-subtle">{movement.sku}</span></td>
                  <td className="py-3 pr-4 text-brand-secondary">{typeLabels[movement.type]}</td>
                  <td className={`py-3 pr-4 font-semibold ${movement.quantity > 0 ? "text-green-700" : "text-red-700"}`}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</td>
                  <td className="max-w-xs py-3 pr-4 text-brand-muted">{movement.reason ?? "—"}</td>
                  <td className="py-3 font-mono text-xs text-brand-muted">{movement.orderId ?? "—"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}
          {data && data.totalPages > 1 && <div className="mt-5 flex items-center justify-between border-t border-brand-border pt-4">
            <button type="button" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setError(""); setPage((current) => current - 1); }} className="rounded-lg border border-brand-border-strong px-4 py-2 text-sm font-semibold text-brand-secondary disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
            <p className="text-sm text-brand-muted">Página {page} de {data.totalPages}</p>
            <button type="button" disabled={page >= data.totalPages || loading} onClick={() => { setLoading(true); setError(""); setPage((current) => current + 1); }} className="rounded-lg border border-brand-border-strong px-4 py-2 text-sm font-semibold text-brand-secondary disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
          </div>}
        </section>
      </div>
    </main>
  );
}
