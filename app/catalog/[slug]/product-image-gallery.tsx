"use client";

import { useEffect, useState } from "react";

type GalleryImage = { id: string; url: string; alt: string | null; variantId: string | null };

export default function ProductImageGallery({
  images,
  productName,
  selectedVariantId,
}: {
  images: GalleryImage[];
  productName: string;
  selectedVariantId: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const visibleImages = images
    .filter((image) => image.variantId === null || image.variantId === selectedVariantId)
    .sort((first, second) => {
      const firstIsSelectedVariant = selectedVariantId !== null && first.variantId === selectedVariantId;
      const secondIsSelectedVariant = selectedVariantId !== null && second.variantId === selectedVariantId;
      return Number(secondIsSelectedVariant) - Number(firstIsSelectedVariant);
    });
  const activeImage = visibleImages[activeIndex];

  useEffect(() => {
    if (!zoomOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomOpen(false);
      if (event.key === "ArrowLeft") setActiveIndex((index) => (index - 1 + visibleImages.length) % visibleImages.length);
      if (event.key === "ArrowRight") setActiveIndex((index) => (index + 1) % visibleImages.length);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visibleImages.length, zoomOpen]);

  if (!activeImage) {
    return <div className="flex aspect-square items-center justify-center rounded-lg bg-brand-image-surface text-sm text-brand-placeholder">Sin imagen</div>;
  }

  function showPrevious() {
    setActiveIndex((index) => (index - 1 + visibleImages.length) % visibleImages.length);
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % visibleImages.length);
  }

  return (
    <section aria-label={`Galería de ${productName}`}>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-brand-image-surface">
        <button type="button" onClick={() => setZoomOpen(true)} className="h-full w-full cursor-zoom-in" aria-label="Ampliar imagen">
          {/* User-managed image URLs may use any public host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeImage.url} alt={activeImage.alt ?? productName} className="h-full w-full object-contain" />
        </button>
        {visibleImages.length > 1 && <>
          <button type="button" onClick={showPrevious} aria-label="Imagen anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl font-semibold text-brand-ink shadow hover:bg-white">‹</button>
          <button type="button" onClick={showNext} aria-label="Imagen siguiente" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl font-semibold text-brand-ink shadow hover:bg-white">›</button>
          <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">{activeIndex + 1} / {visibleImages.length}</span>
        </>}
      </div>

      {visibleImages.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label="Seleccionar imagen">
        {visibleImages.map((image, index) => <button key={image.id} type="button" onClick={() => setActiveIndex(index)} aria-label={`Ver imagen ${index + 1}`} aria-current={activeIndex === index} className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-brand-image-surface ${activeIndex === index ? "border-brand-ink" : "border-transparent"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.alt ?? `${productName}, imagen ${index + 1}`} className="h-full w-full object-contain" />
        </button>)}
      </div>}

      {zoomOpen && <div role="dialog" aria-modal="true" aria-label={`Imagen ampliada de ${productName}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8" onClick={() => setZoomOpen(false)}>
        <button type="button" onClick={() => setZoomOpen(false)} aria-label="Cerrar imagen ampliada" className="absolute right-4 top-4 z-10 rounded-full bg-white/15 px-4 py-2 text-2xl text-white hover:bg-white/25">×</button>
        {visibleImages.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); showPrevious(); }} aria-label="Imagen anterior" className="absolute left-3 z-10 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25 sm:left-8">‹</button>}
        <div className="flex h-full w-full max-w-6xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeImage.url} alt={activeImage.alt ?? productName} className="max-h-full max-w-full object-contain" />
        </div>
        {visibleImages.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); showNext(); }} aria-label="Imagen siguiente" className="absolute right-3 z-10 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25 sm:right-8">›</button>}
      </div>}
    </section>
  );
}
