"use client";

import { useState } from "react";

import { useCartStore } from "@/lib/store/cart-store";

type AddToCartButtonProps = {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  image: string | null;
  availableStock: number;
};

export default function AddToCartButton({
  variantId,
  productId,
  name,
  price,
  image,
  availableStock,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  function handleAddToCart() {
    const existingQuantity =
      useCartStore
        .getState()
        .items.find((item) => item.variantId === variantId)?.quantity ?? 0;

    if (existingQuantity >= availableStock) {
      setAdded(false);
      setStockError("Ya tienes en el carrito todas las unidades disponibles.");
      return;
    }

    setStockError(null);
    addItem({
      variantId,
      productId,
      name,
      price,
      image,
      quantity: 1,
      availableStock,
    });

    setAdded(true);
  }

  return (
    <div className="mt-8">
      {stockError && (
        <p className="mb-2 text-sm text-red-700" role="alert">
          {stockError}
        </p>
      )}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={availableStock === 0}
        className="w-full cursor-pointer rounded-lg bg-black px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {availableStock === 0
          ? "Agotado"
          : added
            ? "Agregado al carrito ✓"
            : "Agregar al carrito"}
      </button>
    </div>
  );
}
