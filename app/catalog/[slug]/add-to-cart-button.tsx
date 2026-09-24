"use client";

import { useState } from "react";

import { useCartStore } from "@/lib/store/cart-store";

type AddToCartButtonProps = {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  image: string | null;
};

export default function AddToCartButton({
  variantId,
  productId,
  name,
  price,
  image,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    addItem({
      variantId,
      productId,
      name,
      price,
      image,
      quantity: 1,
    });

    setAdded(true);
  }

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      className="mt-8 w-full cursor-pointer rounded-lg bg-black px-5 py-3 font-medium text-white"
    >
      {added ? "Agregado al carrito ✓" : "Agregar al carrito"}
    </button>
  );
}