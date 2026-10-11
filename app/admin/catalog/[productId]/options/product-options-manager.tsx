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
  const [variantAssignments, setVariantAssignments] = useState<Record<string, Record<string, string>>>({});
  const [pending, setPending] = useState<Combo[]>([]);
  const [defaultPrice, setDefaultPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigningVariantId, setAssigningVariantId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/catalog/${product.id}/options`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el producto");
      const loadedOptions: Option[] = data.options.map((o: { id: string; name: string; values: { id: string; value: string }[] }) => ({ id: o.id, name: o.name, values: o.values.map(v => ({ id: v.id, value: v.value })) }));
      setOptions(loadedOptions);
      setVariants(data.variants);
      const valueOptionIds = new Map<string, string>(loadedOptions.flatMap(option => option.values.flatMap(value => value.id ? [[value.id, option.id!]] : [])));
      setVariantAssignments(Object.fromEntries(data.variants.map((variant: ExistingVariant) => [
        variant.id,
        Object.fromEntries(variant.optionValueIds.flatMap(valueId => {
          const optionId = valueOptionIds.get(valueId);
          return optionId ? [[optionId, valueId]] : [];
        })),
      ])));
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
  const optionsReady = options.length > 0 && options.every(option => option.id && option.values.length > 0 && option.values.every(value => value.id));
  const activeUnlinkedVariants = variants.filter(variant => variant.isActive && variant.optionValueIds.length !== options.length);
  function prepareCombinations() {
    setError(""); setMessage("");
    if (!options.length || options.some(o => !o.id || !o.values.length || o.values.some(v => !v.id))) { setError("Guarda primero todas las opciones y sus valores."); return; }
    if (activeUnlinkedVariants.length > 0) { setError(`Primero vincula las ${activeUnlinkedVariants.length} variantes activas del paso 3. Generar ahora podría duplicar SKU que ya existen.`); return; }
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

  function updateVariantAssignment(variantId: string, optionId: string, valueId: string) {
    setVariantAssignments(current => ({
      ...current,
      [variantId]: { ...current[variantId], [optionId]: valueId },
    }));
  }

  async function saveVariantAssignment(variant: ExistingVariant) {
    setError(""); setMessage("");
    const optionValueIds = options.map(option => variantAssignments[variant.id]?.[option.id ?? ""] ?? "");
    if (optionValueIds.some(valueId => !valueId)) {
      setError(`Selecciona un valor para cada opción de ${variant.sku}.`);
      return;
    }
    setAssigningVariantId(variant.id);
    try {
      const response = await fetch(`/api/admin/catalog/${product.id}/variants/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: [{ variantId: variant.id, optionValueIds }] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron vincular las opciones");
      setMessage(`Opciones vinculadas a ${variant.sku}. Se conservaron su precio, inventario e historial.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron vincular las opciones"); }
    finally { setAssigningVariantId(null); }
  }

  return <><header className="mt-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-brand-green">Configuración de producto</p><h1 className="mt-2 text-3xl font-semibold text-brand-ink">Opciones y combinaciones</h1><p className="mt-2 text-brand-muted">{product.name}: define opciones como color o capacidad. Cada combinación genera una variante con SKU y precio propios.</p></header>
    {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <section className="mt-6 rounded-2xl border border-brand-border bg-white p-5"><h2 className="font-semibold text-brand-ink">Guía rápida: elige tu flujo</h2><div className="mt-3 grid gap-4 md:grid-cols-2"><div className="rounded-xl bg-brand-background p-4"><h3 className="font-semibold text-brand-ink">Producto nuevo</h3><p className="mt-1 text-sm text-brand-muted">Define y guarda opciones en el paso 1; después usa el paso 2 para generar sus SKU. Esos SKU quedan vinculados automáticamente.</p></div><div className="rounded-xl bg-brand-background p-4"><h3 className="font-semibold text-brand-ink">Ya existen SKU</h3><p className="mt-1 text-sm text-brand-muted">Define y guarda opciones en el paso 1; vincula cada SKU en el paso 3. Cuando todos estén vinculados, el paso 2 sirve para crear solo las combinaciones que falten.</p></div></div><p className="mt-3 text-sm text-brand-muted">Vincular conserva el precio, el inventario y el historial. No generes una combinación que ya corresponde a un SKU existente.</p></section>
    {loading ? <p className="mt-8 text-sm text-brand-muted">Cargando…</p> : <>
      <section className="mt-7 rounded-2xl border border-brand-border bg-white p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h2 className="text-xl font-semibold text-brand-ink">1. Define las opciones</h2><p className="mt-1 text-sm text-brand-muted">Ejemplo: Color → Negro, Blanco. Capacidad → 16 GB, 32 GB.</p></div><span className="text-sm text-brand-muted">Máximo 5 opciones</span></div>
        <div className="mt-5 space-y-4">{options.map((option, oi) => <div key={option.id ?? `new-${oi}`} className="rounded-xl border border-brand-border p-4"><div className="flex items-start gap-3"><label className="min-w-0 flex-1 text-sm font-medium text-brand-secondary">Nombre de opción<input value={option.name} onChange={e => updateOption(oi, { name: e.target.value })} placeholder="Color, capacidad, pulgadas…" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2" /></label><button type="button" onClick={() => removeOption(oi)} className="mt-6 text-sm font-semibold text-red-700">Quitar opción</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{option.values.map((value, vi) => <div key={value.id ?? `${oi}-${vi}`} className="flex gap-2"><input value={value.value} onChange={e => updateValue(oi, vi, e.target.value)} placeholder="Valor (ej. Negro)" className="min-w-0 flex-1 rounded-lg border border-brand-border-strong px-3 py-2"/><button type="button" onClick={() => removeValue(oi, vi)} aria-label="Quitar valor" className="px-2 text-sm font-semibold text-red-700">Quitar</button></div>)}</div><button type="button" onClick={() => updateOption(oi, { values: [...option.values, { value: "" }] })} className="mt-3 text-sm font-semibold text-brand-secondary">+ Añadir valor</button></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={options.length >= 5} onClick={() => { setOptions(current => [...current, blankOption()]); setPending([]); }} className="rounded-lg border border-brand-border-strong px-4 py-2 text-sm font-semibold text-brand-secondary disabled:opacity-50">+ Añadir opción</button><button type="button" disabled={saving} onClick={saveOptions} className="rounded-lg bg-brand-ink px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Guardando…" : "Guardar opciones"}</button></div>
      </section>
      <section className="mt-6 rounded-2xl border border-brand-border bg-white p-6"><h2 className="text-xl font-semibold text-brand-ink">2. Genera las variantes que falten</h2><p className="mt-1 text-sm text-brand-muted">Úsalo para un producto nuevo o después de vincular los SKU existentes en el paso 3. Cada combinación genera un SKU con precio propio.</p>{!optionsReady && <p className="mt-3 text-sm text-amber-800">Guarda primero todas las opciones y sus valores en el paso 1.</p>}{activeUnlinkedVariants.length > 0 && <p className="mt-3 text-sm text-amber-800">Hay {activeUnlinkedVariants.length} SKU activos sin opciones. Vincúlalos en el paso 3 antes de generar para evitar duplicados.</p>}<label className="mt-4 block max-w-xs text-sm font-medium text-brand-secondary">Precio inicial (MXN)<input type="number" min="0.01" step="0.01" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} placeholder="Ej. 2499" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2"/></label><button type="button" disabled={!optionsReady || saving} onClick={prepareCombinations} className="mt-4 rounded-lg border border-brand-border-strong px-4 py-2 text-sm font-semibold text-brand-secondary disabled:opacity-50">Preparar combinaciones</button>
        {pending.length > 0 && <div className="mt-5"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-brand-text-subtle"><th className="p-2">Combinación</th><th className="p-2">SKU (editable)</th><th className="p-2">Precio MXN</th></tr></thead><tbody>{pending.map((combo, i) => <tr key={combo.optionValueIds.join("|")} className="border-b border-brand-border"><td className="p-2 text-brand-secondary">{combo.labels.join(" · ")}</td><td className="p-2"><input value={combo.sku} onChange={e => updateCombo(i, { sku: slug(e.target.value) })} className="w-full rounded border border-brand-border-strong px-2 py-1"/></td><td className="p-2"><input type="number" min="0.01" step="0.01" value={combo.price} onChange={e => updateCombo(i, { price: e.target.value })} className="w-32 rounded border border-brand-border-strong px-2 py-1"/></td></tr>)}</tbody></table></div><button type="button" disabled={saving || pending.some(c => !c.sku || Number(c.price) <= 0)} onClick={createVariants} className="mt-4 rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creando…" : `Crear ${pending.length} variantes`}</button></div>}
      </section>
      <section className="mt-6 rounded-2xl border border-brand-border bg-white p-6"><h2 className="text-xl font-semibold text-brand-ink">3. Vincula variantes existentes</h2><p className="mt-1 text-sm text-brand-muted">Las variantes creadas antes de configurar opciones no aparecen en la tienda hasta que las vincules. Esto conserva su SKU, precio, inventario y pedidos.</p>{!optionsReady ? <p className="mt-3 text-sm text-brand-muted">Define y guarda al menos una opción y sus valores antes de vincular SKU.</p> : variants.length ? <ul className="mt-4 divide-y divide-brand-border">{variants.map(variant => <li key={variant.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-semibold text-brand-secondary">{variant.sku}</span><span className={`ml-2 rounded-full px-2 py-1 text-xs font-semibold ${variant.isActive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>{variant.isActive ? "Activa" : "Inactiva"}</span><p className="mt-1 text-sm text-brand-muted">${Number(variant.price).toFixed(2)} MXN · {variant.optionValueIds.length === 0 ? "Sin opciones vinculadas" : variant.optionValueIds.length === options.length ? "Vinculada" : `Incompleta (${variant.optionValueIds.length}/${options.length})`}</p></div><button type="button" disabled={assigningVariantId === variant.id || !variant.isActive} onClick={() => saveVariantAssignment(variant)} className="rounded-lg border border-brand-border-strong px-3 py-2 text-sm font-semibold text-brand-secondary disabled:opacity-50">{assigningVariantId === variant.id ? "Guardando…" : variant.optionValueIds.length === options.length ? "Actualizar opciones" : "Vincular SKU"}</button></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{options.map((option, optionIndex) => <label key={option.id ?? `option-${optionIndex}`} className="text-sm font-medium text-brand-secondary">{option.name}<select value={variantAssignments[variant.id]?.[option.id ?? ""] ?? ""} onChange={event => updateVariantAssignment(variant.id, option.id ?? "", event.target.value)} disabled={!variant.isActive} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2 disabled:bg-slate-50"><option key="unselected" value="">Selecciona…</option>{option.values.map((value, valueIndex) => <option key={value.id ?? `${optionIndex}-${valueIndex}`} value={value.id ?? ""}>{value.value}</option>)}</select></label>)}</div></li>)}</ul> : <p className="mt-3 text-sm text-brand-muted">Crea o vincula una variante primero.</p>}</section>
    </>}
  </>;
}
