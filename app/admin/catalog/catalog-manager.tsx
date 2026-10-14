"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string };
type Product = { id: string; name: string; slug: string; brand: string | null; model: string | null; description: string | null; isActive: boolean; categoryId: string; category: { name: string }; variants: { id: string; sku: string; price: string; isActive: boolean; availableStock: number }[]; images: { id: string; url: string; alt: string | null }[] };
const empty = { categoryId: "", name: "", slug: "", brand: "", model: "", description: "", isActive: true };

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").trim();
}

export default function CatalogManager() {
  const [products, setProducts] = useState<Product[]>([]); const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(empty); const [editing, setEditing] = useState<string | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [search, setSearch] = useState(""); const [categoryFilter, setCategoryFilter] = useState("");
  const fetchCatalog = useCallback(async () => { const r = await fetch("/api/admin/catalog", { cache: "no-store" }); const d = await r.json(); if (!r.ok) throw new Error(d.error); return d as { products: Product[]; categories: Category[] }; }, []);
  const applyCatalog = useCallback((data: { products: Product[]; categories: Category[] }) => { setProducts(data.products); setCategories(data.categories); setForm((f) => f.categoryId ? f : { ...f, categoryId: data.categories[0]?.id ?? "" }); }, []);
  const load = useCallback(async () => { applyCatalog(await fetchCatalog()); }, [applyCatalog, fetchCatalog]);
  const filteredProducts = products.filter((product) => {
    const matchesName = normalizeSearch(product.name).includes(normalizeSearch(search));
    const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;
    return matchesName && matchesCategory;
  });
  useEffect(() => { let active = true; fetchCatalog().then((data) => { if (active) applyCatalog(data); }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "No se pudo cargar el catálogo"); }); return () => { active = false; }; }, [applyCatalog, fetchCatalog]);
  function selectProduct(product: Product) { setEditing(product.id); setForm({ categoryId: product.categoryId, name: product.name, slug: product.slug, brand: product.brand ?? "", model: product.model ?? "", description: product.description ?? "", isActive: product.isActive }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function submit(event: FormEvent) { event.preventDefault(); setMessage(""); setError(""); const url = editing ? `/api/admin/catalog/${editing}` : "/api/admin/catalog"; const r = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const d = await r.json(); if (!r.ok) { setError(d.error ?? "No se pudo guardar"); return; } setMessage(editing ? "Producto actualizado." : "Producto creado. Añade sus variantes e imágenes en el siguiente paso."); setEditing(null); setForm({ ...empty, categoryId: categories[0]?.id ?? "" }); await load(); }
  async function toggle(product: Product) { const r = await fetch(`/api/admin/catalog/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !product.isActive }) }); const d = await r.json(); if (!r.ok) { setError(d.error ?? "No se pudo actualizar"); return; } setMessage(product.isActive ? "Producto oculto de la tienda." : "Producto publicado en la tienda."); await load(); }
  return <main className="min-h-screen bg-brand-background px-5 py-10 sm:px-8"><div className="mx-auto max-w-6xl"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-brand-green">Operación interna</p><h1 className="mt-2 text-3xl font-semibold text-brand-ink">Catálogo</h1><p className="mt-2 text-sm text-brand-muted">Crea, edita, publica u oculta productos sin modificar código.</p></div><Link href="/admin" className="text-sm font-semibold text-brand-secondary">← Volver a administración</Link></div>
    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <form onSubmit={submit} className="mt-7 grid gap-4 rounded-2xl border border-brand-border bg-white p-6 md:grid-cols-2"><h2 className="md:col-span-2 text-xl font-semibold text-brand-ink">{editing ? "Editar producto" : "Nuevo producto"}</h2>{(["name", "slug", "brand", "model"] as const).map((key) => <label key={key} className="text-sm font-medium text-brand-secondary">{key === "name" ? "Nombre" : key === "slug" ? "URL (slug)" : key === "brand" ? "Marca" : "Modelo"}<input required={key === "name" || key === "slug"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2 text-brand-ink" /></label>)}<label className="text-sm font-medium text-brand-secondary">Categoría<select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="flex items-end gap-2 pb-2 text-sm font-medium text-brand-secondary"><input checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} type="checkbox" /> Publicar en tienda</label><label className="md:col-span-2 text-sm font-medium text-brand-secondary">Descripción<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 block min-h-24 w-full rounded-lg border border-brand-border-strong px-3 py-2" /></label><div className="flex gap-3 md:col-span-2"><button className="rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-bold text-white">{editing ? "Guardar cambios" : "Crear producto"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm({ ...empty, categoryId: categories[0]?.id ?? "" }); }} className="text-sm font-semibold text-brand-secondary">Cancelar</button>}</div></form>
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-brand-ink">Productos</h2><p className="mt-1 text-sm text-brand-muted">{filteredProducts.length} de {products.length} productos</p></div></div>
      <div className="mt-4 grid gap-3 rounded-xl border border-brand-border bg-white p-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-brand-secondary">Buscar por nombre
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. Monitor ASUS" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-brand-secondary">Filtrar por categoría
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2">
            <option value="">Todas las categorías</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        {(search || categoryFilter) && <button type="button" onClick={() => { setSearch(""); setCategoryFilter(""); }} className="justify-self-start text-sm font-semibold text-brand-secondary sm:col-span-2">Limpiar filtros</button>}
      </div>
      {filteredProducts.length === 0 ? <p className="mt-4 rounded-xl border border-brand-border bg-white p-7 text-center text-sm text-brand-muted">{products.length ? "No hay productos que coincidan con esos filtros." : "No hay productos registrados en el catálogo."}</p> : <div className="mt-4 grid gap-4 md:grid-cols-2">{filteredProducts.map((p) => {
        const activeVariantCount = p.variants.filter((variant) => variant.isActive).length;
        const visibleVariantCount = p.variants.filter((variant) => variant.isActive && variant.availableStock > 0).length;
        const inactiveStockCount = p.variants.filter((variant) => !variant.isActive && variant.availableStock > 0).length;
        const availableStock = p.variants.reduce((total, variant) => total + (variant.isActive ? variant.availableStock : 0), 0);
        return <article key={p.id} className="rounded-xl border border-brand-border bg-white p-5"><div className="flex justify-between gap-3"><div><h3 className="font-semibold text-brand-ink">{p.name}</h3><p className="text-sm text-brand-muted">{p.category.name} · /{p.slug}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${p.isActive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>{p.isActive ? "Publicado" : "Oculto"}</span></div><p className="mt-3 text-sm text-brand-muted">{p.variants.length} variantes · {activeVariantCount} activas · {availableStock} disponibles · {p.images.length} imágenes</p>{p.isActive && visibleVariantCount === 0 && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">No aparece en la tienda porque necesita una variante activa con stock disponible.{inactiveStockCount > 0 ? ` ${inactiveStockCount} variante(s) inactiva(s) sí tienen existencias; puedes reactivarlas desde Precios y SKU.` : ""}</p>}<div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold"><button onClick={() => selectProduct(p)} className="text-brand-secondary">Editar</button><Link href={`/admin/catalog/${p.id}/options`} className="text-brand-secondary">Opciones</Link><Link href={`/admin/catalog/${p.id}/variants`} className="text-brand-secondary">Precios y SKU</Link><Link href={`/admin/catalog/${p.id}/images`} className="text-brand-secondary">Imágenes</Link><button onClick={() => toggle(p)} className="text-brand-secondary">{p.isActive ? "Ocultar" : "Publicar"}</button></div></article>;
      })}</div>}
    </section>
  </div></main>;
}
