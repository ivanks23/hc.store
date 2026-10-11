"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
type Value = { id?: string; value: string };
type Option = { id?: string; name: string; values: Value[] };
type ExistingVariant = { id: string; sku: string; price: string; isActive: boolean; optionValueIds: string[] };
type Combo = { optionValueIds: string[]; labels: string[]; sku: string; price: string };
type Props = { product: { id: string; name: string; slug: string } };
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const blankOption = (): Option => ({ name: "", values: [{ value: "" }, { value: "" }] });

export default function ProductOptionsManager({ product }: Props) {
  const [options, setOptions] = useState<Option[]>([]);
  const [variants, setVariants] = useState<ExistingVariant[]>([]);
  const [pending, setPending] = useState<Combo[]>([]);
  const [defaultPrice, setDefaultPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/catalog/${product.id}/options`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el producto");
      setOptions(data.options.map((o: { id: string; name: string; values: { id: string; value: string }[] }) => ({ id: o.id, name: o.name, values: o.values.map(v => ({ id: v.id, value: v.value })) })));
      setVariants(data.variants);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar"); }
    finally { setLoading(false); }
  }, [product.id]);
  // This effect starts an async request; state changes happen only after its response settles.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function updateOption(index: number, patch: Partial<Option>) { setOptions(current => current.map((option, i) => i === index ? { ...option, ...patch } : option)); setPending([]); }
  function updateValue(optionIndex: number, valueIndex: number, value: string) { setOptions(current => current.map((option, i) => i === optionIndex ? { ...option, values: option.values.map((item, j) => j === valueIndex ? { ...item, value } : item) } : option)); setPending([]); }
  function removeOption(index: number) { const option = options[index]; const optionValueIds = new Set(option.values.flatMap(value => value.id ? [value.id] : [])); if (variants.some(variant => variant.optionValueIds.some(id => optionValueIds.has(id)))) { setError("Esta opción ya se usa en variantes existentes. No se puede quitar mientras esas variantes la necesiten."); return; } setOptions(current => current.filter((_, i) => i !== index)); setPending([]); setError(""); }
  function removeValue(optionIndex: number, valueIndex: number) { const value = options[optionIndex].values[valueIndex]; if (value.id && variants.some(v => v.optionValueIds.includes(value.id!))) { setError("Ese valor ya está asignado a una variante y no se puede quitar."); return; } setOptions(current => current.map((option, i) => i === optionIndex ? { ...option, values: option.values.filter((_, j) => j !== valueIndex) } : option)); setPending([]); setError(""); }

  async function saveOptions() {
    setError(""); setMessage(""); setSaving(true);
    try {
      const response = await fetch(`/api/admin/catalog/${product.id}/options`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ options }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron guardar las opciones");
      setMessage("Opciones guardadas."); setPending([]); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron guardar las opciones"); }
    finally { setSaving(false); }
  }

  const existingKeys = useMemo(() => new Set(variants.map(v => [...v.optionValueIds].sort().join("|"))), [variants]);
  function prepareCombinations() {
    setError(""); setMessage("");
    if (!options.length || options.some(o => !o.id || !o.values.length || o.values.some(v => !v.id))) { setError("Guarda primero todas las opciones y sus valores."); return; }
    const count = options.reduce((total, option) => total * option.values.length, 1);
    if (count > 100) { setError(`La combinación genera ${count} variantes. Reduce los valores; el máximo por producto es 100.`); return; }
    let rows: { ids: string[]; labels: string[] }[] = [{ ids: [], labels: [] }];
    for (const option of options) rows = rows.flatMap(row => option.values.map(value => ({ ids: [...row.ids, value.id!], labels: [...row.labels, `${option.name}: ${value.value}`] })));
    const combos = rows.filter(row => !existingKeys.has([...row.ids].sort().join("|"))).map(row => ({ optionValueIds: row.ids, labels: row.labels, sku: slug(`${product.slug}-${row.labels.map(label => label.split(": ").at(-1)).join("-")}`).slice(0, 100).replace(/-$/, ""), price: defaultPrice }));
    if (!combos.length) { setError("Todas las combinaciones ya tienen una variante."); return; }
    setPending(combos);
  }
  function updateCombo(index: number, patch: Partial<Combo>) { setPending(rows => rows.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  async function createVariants() {
    setError(""); setMessage(""); setSaving(true);
    try {
      const response = await fetch(`/api/admin/catalog/${product.id}/variants/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ combinations: pending.map(({ optionValueIds, sku, price }) => ({ optionValueIds, sku, price: Number(price) })) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudieron crear las variantes");
      setMessage(`Variantes creadas: ${data.created}. Combinaciones existentes omitidas: ${data.skipped}.`); setPending([]); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron crear las variantes"); }
    finally { setSaving(false); }
  }

  return <><header className="mt-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand-green">Configuración de producto</p><h1 className="mt-2 text-3xl font-semibold text-brand-ink">Opciones y combinaciones</h1><p className="mt-2 text-brand-muted">{product.name}: define opciones como color o capacidad. Cada combinación genera una variante con SKU y precio propios.</p></header>
    {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {loading ? <p className="mt-8 text-sm text-brand-muted">Cargando…</p> : <>
      <section className="mt-7 rounded-2xl border border-brand-border bg-white p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h2 className="text-xl font-semibold text-brand-ink">1. Define las opciones</h2><p className="mt-1 text-sm text-brand-muted">Ejemplo: Color → Negro, Blanco. Capacidad → 16 GB, 32 GB.</p></div><span className="text-sm text-brand-muted">Máximo 5 opciones</span></div>
        <div className="mt-5 space-y-4">{options.map((option, oi) => <div key={option.id ?? `new-${oi}`} className="rounded-xl border border-brand-border p-4"><div className="flex items-start gap-3"><label className="min-w-0 flex-1 text-sm font-medium text-brand-secondary">Nombre de opción<input value={option.name} onChange={e => updateOption(oi, { name: e.target.value })} placeholder="Color, capacidad, pulgadas…" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2" /></label><button type="button" onClick={() => removeOption(oi)} className="mt-6 text-sm font-semibold text-red-700">Quitar opción</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{option.values.map((value, vi) => <div key={value.id ?? `${oi}-${vi}`} className="flex gap-2"><input value={value.value} onChange={e => updateValue(oi, vi, e.target.value)} placeholder="Valor (ej. Negro)" className="min-w-0 flex-1 rounded-lg border border-brand-border-strong px-3 py-2"/><button type="button" onClick={() => removeValue(oi, vi)} aria-label="Quitar valor" className="px-2 text-sm font-semibold text-red-700">Quitar</button></div>)}</div><button type="button" onClick={() => updateOption(oi, { values: [...option.values, { value: "" }] })} className="mt-3 text-sm font-semibold text-brand-secondary">+ Añadir valor</button></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={options.length >= 5} onClick={() => { setOptions(current => [...current, blankOption()]); setPending([]); }} className="rounded-lg border border-brand-border-strong px-4 py-2 text-sm font-semibold text-brand-secondary disabled:opacity-50">+ Añadir opción</button><button type="button" disabled={saving} onClick={saveOptions} className="rounded-lg bg-brand-ink px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Guardando…" : "Guardar opciones"}</button></div>
      </section>
      <section className="mt-6 rounded-2xl border border-brand-border bg-white p-6"><h2 className="text-xl font-semibold text-brand-ink">2. Genera las variantes</h2><p className="mt-1 text-sm text-brand-muted">Se crea una variante por combinación, por ejemplo Negro + 16 GB. Puedes definir un precio distinto en cada fila.</p><label className="mt-4 block max-w-xs text-sm font-medium text-brand-secondary">Precio inicial (MXN)<input type="number" min="0.01" step="0.01" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} placeholder="Ej. 2499" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2"/></label><button type="button" onClick={prepareCombinations} className="mt-4 rounded-lg border border-brand-border-strong px-4 py-2 text-sm font-semibold text-brand-secondary">Preparar combinaciones</button>
        {pending.length > 0 && <div className="mt-5"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-brand-text-subtle"><th className="p-2">Combinación</th><th className="p-2">SKU (editable)</th><th className="p-2">Precio MXN</th></tr></thead><tbody>{pending.map((combo, i) => <tr key={combo.optionValueIds.join("|")} className="border-b border-brand-border"><td className="p-2 text-brand-secondary">{combo.labels.join(" · ")}</td><td className="p-2"><input value={combo.sku} onChange={e => updateCombo(i, { sku: slug(e.target.value) })} className="w-full rounded border border-brand-border-strong px-2 py-1"/></td><td className="p-2"><input type="number" min="0.01" step="0.01" value={combo.price} onChange={e => updateCombo(i, { price: e.target.value })} className="w-32 rounded border border-brand-border-strong px-2 py-1"/></td></tr>)}</tbody></table></div><button type="button" disabled={saving || pending.some(c => !c.sku || Number(c.price) <= 0)} onClick={createVariants} className="mt-4 rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creando…" : `Crear ${pending.length} variantes`}</button></div>}
      </section>
      <section className="mt-6 rounded-2xl border border-brand-border bg-white p-6"><h2 className="text-xl font-semibold text-brand-ink">Variantes creadas ({variants.length})</h2>{variants.length ? <ul className="mt-3 divide-y divide-brand-border">{variants.map(v => <li key={v.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold text-brand-secondary">{v.sku}</span><span className="text-brand-muted">${Number(v.price).toFixed(2)} MXN</span></li>)}</ul> : <p className="mt-2 text-sm text-brand-muted">Aún no hay variantes configuradas.</p>}</section>
    </>}
  </>;
}
