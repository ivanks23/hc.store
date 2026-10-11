"use client";

import { useMemo, useState } from "react";

import { useCartStore } from "@/lib/store/cart-store";

type AddToCartButtonProps = {
  productId: string;
  name: string;
  image: string | null;
  variants: {
    id: string;
    sku: string;
    price: number;
    availableStock: number;
    attributes: {
      value: string;
      attribute: { name: string };
    }[];
    optionValues?: { name: string; value: string }[];
  }[];
};

export default function AddToCartButton({
  productId,
  name,
  image,
  variants,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () => Object.fromEntries((variants.find((variant) => variant.optionValues?.length)?.optionValues ?? []).map((item) => [item.name, item.value])),
  );
  const [added, setAdded] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const optionNames = useMemo(
    () => [...new Set(variants.flatMap((variant) => (variant.optionValues ?? []).map((item) => item.name)))],
    [variants],
  );
  const optionVariants = optionNames.length
    ? variants.filter((variant) => optionNames.every((name) => variant.optionValues?.some((item) => item.name === name)))
    : variants;
  const selectedVariant = optionNames.length
    ? optionVariants.find((variant) => optionNames.every((name) => variant.optionValues?.some((item) => item.name === name && item.value === selectedOptions[name])))
    : variants.find((variant) => variant.id === selectedVariantId);

  function getVariantLabel(variant: (typeof variants)[number]) {
    if (variant.optionValues?.length) {
      return variant.optionValues.map((item) => `${item.name}: ${item.value}`).join(" · ");
    }
    if (variant.attributes.length === 0) return variant.sku;
    return variant.attributes
      .map((item) => `${item.attribute.name}: ${item.value}`)
      .join(" · ");
  }

  function handleAddToCart() {
    if (!selectedVariant) return;

    const existingQuantity =
      useCartStore
        .getState()
        .items.find((item) => item.variantId === selectedVariant.id)?.quantity ?? 0;

    if (existingQuantity >= selectedVariant.availableStock) {
      setAdded(false);
      setStockError("Ya tienes en el carrito todas las unidades disponibles.");
      return;
    }

    setStockError(null);
    addItem({
      variantId: selectedVariant.id,
      productId,
      name,
      price: selectedVariant.price,
      image,
      quantity: 1,
      availableStock: selectedVariant.availableStock,
    });

    setAdded(true);
  }

  return (
    <div className="mt-8">
      {optionNames.length > 0 ? (
        <div className="space-y-4">
          {optionNames.map((name) => {
            const values = [...new Set(optionVariants.flatMap((variant) => variant.optionValues?.filter((item) => item.name === name).map((item) => item.value) ?? []))];
            return <label key={name} className="block text-sm font-semibold text-brand-ink">
              {name}
              <select
                value={selectedOptions[name] ?? ""}
                onChange={(event) => {
                  const next = { ...selectedOptions, [name]: event.target.value };
                  setSelectedOptions(next);
                  const match = optionVariants.find((variant) => optionNames.every((optionName) => variant.optionValues?.some((item) => item.name === optionName && item.value === next[optionName])));
                  setSelectedVariantId(match?.id ?? "");
                  setAdded(false);
                  setStockError(null);
                }}
                className="mt-2 block w-full rounded-lg border border-brand-border-strong bg-white px-3 py-2.5 text-brand-ink"
              >
                {values.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>;
          })}
          {!selectedVariant && <p className="text-sm text-brand-muted">Esta combinación no está disponible.</p>}
        </div>
      ) : variants.length > 1 && (
        <fieldset>
          <legend className="text-sm font-semibold text-brand-ink">Elige una variante</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const isSelected = variant.id === selectedVariantId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setAdded(false);
                    setStockError(null);
                  }}
                  className={`rounded-xl border px-3 py-2 text-left transition ${isSelected ? "border-brand-green bg-brand-green-selected ring-1 ring-brand-green" : "border-brand-border bg-white hover:border-brand-border-strong"}`}
                >
                  <span className="block text-sm font-semibold text-brand-ink">{getVariantLabel(variant)}</span>
                  <span className="mt-1 block text-xs text-brand-text-subtle">
                    ${variant.price.toFixed(2)} · {variant.availableStock > 0 ? `${variant.availableStock} disponibles` : "Agotado"}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {selectedVariant && (
        <div className="mb-4 mt-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-subtle">Precio</p>
            <p className="mt-1 text-3xl font-bold text-brand-ink">${selectedVariant.price.toFixed(2)}</p>
          </div>
          <p className="text-sm text-brand-muted">
            {selectedVariant.availableStock > 0 ? `${selectedVariant.availableStock} disponibles` : "Agotado"}
          </p>
        </div>
      )}

      {stockError && (
        <p className="mb-2 text-sm text-red-700" role="alert">
          {stockError}
        </p>
      )}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!selectedVariant || selectedVariant.availableStock === 0}
        className="w-full cursor-pointer rounded-lg bg-brand-ink px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {!selectedVariant || selectedVariant.availableStock === 0
          ? "Agotado"
          : added
            ? "Agregado al carrito ✓"
            : "Agregar al carrito"}
      </button>
    </div>
  );
}
