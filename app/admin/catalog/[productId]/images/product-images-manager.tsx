"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ProductImage = { id: string; url: string; alt: string | null; position: number; variantId: string | null };
type ImageVariant = { id: string; sku: string; label: string; isActive: boolean };

export default function ProductImagesManager({
  productId,
  productName,
  variants,
}: {
  productId: string;
  productName: string;
  variants: ImageVariant[];
}) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [editingAlt, setEditingAlt] = useState<Record<string, string>>({});
  const [editingVariant, setEditingVariant] = useState<Record<string, string>>({});
  const [newImageVariantId, setNewImageVariantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchImages = useCallback(async () => {
    const response = await fetch(`/api/products/${productId}/images`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las imágenes");
    return (data as ProductImage[]).sort((a, b) => a.position - b.position);
  }, [productId]);

  const applyImages = useCallback((ordered: ProductImage[]) => {
    setImages(ordered);
    setEditingAlt(Object.fromEntries(ordered.map((image) => [image.id, image.alt ?? ""])));
    setEditingVariant(Object.fromEntries(ordered.map((image) => [image.id, image.variantId ?? ""])));
  }, []);

  const loadImages = useCallback(async () => {
    try {
      applyImages(await fetchImages());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las imágenes");
    } finally {
      setLoading(false);
    }
  }, [applyImages, fetchImages]);

  useEffect(() => {
    let active = true;
    fetchImages().then((data) => { if (active) applyImages(data); }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las imágenes");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applyImages, fetchImages]);

  async function addImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), alt: alt.trim(), variantId: newImageVariantId || null, position: Math.max(-1, ...images.map((image) => image.position)) + 1 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo agregar la imagen");
      setUrl("");
      setAlt("");
      setNewImageVariantId("");
      setMessage("Imagen agregada a la galería.");
      await loadImages();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo agregar la imagen");
    } finally {
      setSaving(false);
    }
  }

  async function saveImageDetails(image: ProductImage) {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt: editingAlt[image.id]?.trim() ?? "", variantId: editingVariant[image.id] || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el texto alternativo");
      setMessage("Texto alternativo actualizado.");
      await loadImages();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el texto alternativo");
    } finally {
      setSaving(false);
    }
  }

  async function moveImage(index: number, offset: -1 | 1) {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: reordered.map((image) => image.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cambiar el orden");
      setImages(data as ProductImage[]);
      setMessage("Orden de la galería actualizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar el orden");
    } finally {
      setSaving(false);
    }
  }

  async function deleteImage(image: ProductImage) {
    if (!window.confirm("¿Eliminar esta imagen de la galería?")) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/images/${image.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo eliminar la imagen");
      setMessage("Imagen eliminada de la galería.");
      await loadImages();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la imagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-7 space-y-7">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      <form onSubmit={addImage} className="grid gap-4 rounded-2xl border border-brand-border bg-white p-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold text-brand-ink">Agregar imagen</h2>
          <p className="mt-1 text-sm text-brand-muted">Pega una URL pública de imagen. La primera imagen de la lista será la principal en la tienda.</p>
        </div>
        <label className="text-sm font-medium text-brand-secondary md:col-span-2">
          URL de la imagen
          <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-brand-secondary md:col-span-2">
          Texto alternativo <span className="font-normal text-brand-muted">(describe la imagen para accesibilidad)</span>
          <input maxLength={200} value={alt} onChange={(event) => setAlt(event.target.value)} placeholder={`Imagen de ${productName}`} className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-brand-secondary md:col-span-2">Mostrar imagen para
          <select value={newImageVariantId} onChange={(event) => setNewImageVariantId(event.target.value)} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2">
            <option value="">Todas las variantes</option>
            {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.sku}{variant.label ? ` · ${variant.label}` : ""}{variant.isActive ? "" : " · Inactiva"}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-brand-muted">Elige una variante para que la imagen aparezca al seleccionarla en la tienda.</span>
        </label>
        <div className="md:col-span-2">
          <button disabled={saving} className="rounded-lg bg-brand-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Guardando…" : "Agregar a la galería"}</button>
        </div>
      </form>

      <div className="rounded-2xl border border-brand-border bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold text-brand-ink">Galería</h2><p className="mt-1 text-sm text-brand-muted">{images.length} {images.length === 1 ? "imagen" : "imágenes"}. La primera aparece como principal.</p></div>
        </div>
        {loading ? <p className="mt-5 text-sm text-brand-muted">Cargando imágenes…</p> : images.length === 0 ? (
          <p className="mt-5 rounded-xl bg-brand-background p-6 text-center text-sm text-brand-muted">Este producto todavía no tiene imágenes.</p>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <li key={image.id} className="overflow-hidden rounded-xl border border-brand-border">
                <div className="relative aspect-square bg-brand-background">
                  {/* Product image URLs are user-managed and can come from any public image host. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt ?? ""} className="h-full w-full object-contain" />
                  {index === 0 && <span className="absolute left-3 top-3 rounded-full bg-brand-ink px-3 py-1 text-xs font-bold text-white">Principal</span>}
                </div>
                <div className="space-y-3 p-4">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-brand-text-subtle">Mostrar imagen para
                    <select value={editingVariant[image.id] ?? ""} onChange={(event) => setEditingVariant((current) => ({ ...current, [image.id]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-brand-ink">
                      <option value="">Todas las variantes</option>
                      {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.sku}{variant.label ? ` · ${variant.label}` : ""}{variant.isActive ? "" : " · Inactiva"}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-brand-text-subtle">Texto alternativo
                    <input maxLength={200} value={editingAlt[image.id] ?? ""} onChange={(event) => setEditingAlt((current) => ({ ...current, [image.id]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-brand-border-strong px-3 py-2 text-sm font-normal normal-case tracking-normal text-brand-ink" />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={saving || index === 0} onClick={() => void moveImage(index, -1)} aria-label="Mover imagen hacia arriba" className="rounded-lg border border-brand-border-strong px-3 py-2 text-sm disabled:opacity-40">↑</button>
                    <button type="button" disabled={saving || index === images.length - 1} onClick={() => void moveImage(index, 1)} aria-label="Mover imagen hacia abajo" className="rounded-lg border border-brand-border-strong px-3 py-2 text-sm disabled:opacity-40">↓</button>
                    <button type="button" disabled={saving} onClick={() => void saveImageDetails(image)} className="rounded-lg border border-brand-border-strong px-3 py-2 text-sm font-semibold text-brand-secondary disabled:opacity-50">Guardar cambios</button>
                    <button type="button" disabled={saving} onClick={() => void deleteImage(image)} className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Eliminar</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
