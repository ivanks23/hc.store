"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Variant = { id: string; sku: string; price: string; isActive: boolean };
type Props = { product: { id: string; name: string; variants: Variant[] } };
const empty = { sku: "", price: "" };

function normalizeSku(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function VariantManager({ product }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function save(event: FormEvent, url: string, method: "POST" | "PATCH") {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: normalizeSku(form.sku), price: Number(form.price) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la variante");
      setForm(empty);
      setEditing(null);
      setMessage(method === "POST" ? "Variante creada." : "Variante actualizada.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la variante");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(variant: Variant) {
    const action = variant.isActive ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Quieres ${action} ${variant.sku}? ${variant.isActive ? "Dejará de venderse, pero su historial se conserva." : "Volverá a estar disponible según su inventario."}`)) return;
    setUpdatingId(variant.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/catalog/variants/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !variant.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `No se pudo ${action} la variante`);
      setMessage(variant.isActive ? "Variante desactivada; el historial se conserva." : "Variante reactivada.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `No se pudo ${action} la variante`);
    } finally {
      setUpdatingId(null);
    }
  }

  function fields() {
    return <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-brand-secondary">SKU
        <input required minLength={2} maxLength={100} value={form.sku} onChange={event => setForm(current => ({ ...current, sku: normalizeSku(event.target.value) }))} placeholder="Ej. MONITOR-27-NEGRO" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2" />
        <span className="mt-1 block text-xs font-normal text-brand-muted">Puedes escribir con espacios; se convertirán a guiones.</span>
      </label>
      <label className="text-sm font-medium text-brand-secondary">Precio (MXN)
        <input required type="number" min="0.01" step="0.01" value={form.price} onChange={event => setForm(current => ({ ...current, price: event.target.value }))} placeholder="Ej. 2499.00" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2" />
      </label>
    </div>;
  }

  return <>
    <header className="mt-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand-green">Catálogo</p><h1 className="mt-2 text-3xl font-semibold text-brand-ink">Variantes de {product.name}</h1><p className="mt-2 text-sm text-brand-muted">Administra SKU y precio. Desactivar una variante la retira de la tienda y conserva sus pedidos e inventario históricos.</p></header>
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}

    <form onSubmit={event => save(event, `/api/products/${product.id}/variants`, "POST")} className="mt-6 rounded-2xl border border-brand-border bg-white p-5">
      <h2 className="text-lg font-semibold text-brand-ink">Añadir variante</h2><div className="mt-4">{fields()}</div>
      <button disabled={saving} className="mt-5 rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Guardando…" : "Añadir variante"}</button>
    </form>

    <section className="mt-6 rounded-2xl border border-brand-border bg-white p-5"><h2 className="text-lg font-semibold text-brand-ink">Variantes registradas ({product.variants.length})</h2>
      {product.variants.length === 0 ? <p className="mt-3 text-sm text-brand-muted">Aún no hay variantes.</p> : <div className="mt-3 divide-y divide-brand-border">
        {product.variants.map(variant => <article key={variant.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><strong className="text-brand-ink">{variant.sku}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${variant.isActive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>{variant.isActive ? "Activa" : "Inactiva"}</span></div><p className="mt-1 text-sm text-brand-muted">${Number(variant.price).toFixed(2)} MXN</p></div>
          <div className="flex gap-4 text-sm font-semibold"><button type="button" onClick={() => { setEditing(variant); setForm({ sku: variant.sku, price: variant.price }); setError(""); }} className="text-brand-secondary">Editar</button><button type="button" disabled={updatingId === variant.id} onClick={() => toggleActive(variant)} className={variant.isActive ? "text-red-700" : "text-brand-green"}>{updatingId === variant.id ? "Actualizando…" : variant.isActive ? "Desactivar" : "Reactivar"}</button></div>
        </article>)}
      </div>}
    </section>

    {editing && <form onSubmit={event => save(event, `/api/admin/catalog/variants/${editing.id}`, "PATCH")} className="mt-6 rounded-2xl border border-brand-border bg-white p-5"><h2 className="text-lg font-semibold text-brand-ink">Editar {editing.sku}</h2><div className="mt-4">{fields()}</div><div className="mt-5 flex gap-4"><button disabled={saving} className="rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">Guardar cambios</button><button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="text-sm font-semibold text-brand-secondary">Cancelar</button></div></form>}
  </>;
}
