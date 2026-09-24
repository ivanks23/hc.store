import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
};

type CartStore = {
  items: CartItem[];

  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find(
        (currentItem) => currentItem.variantId === item.variantId,
      );

      if (existingItem) {
        return {
          items: state.items.map((currentItem) =>
            currentItem.variantId === item.variantId
              ? {
                  ...currentItem,
                  quantity: currentItem.quantity + item.quantity,
                }
              : currentItem,
          ),
        };
      }

      return {
        items: [...state.items, item],
      };
    }),

  removeItem: (variantId) =>
    set((state) => ({
      items: state.items.filter(
        (item) => item.variantId !== variantId,
      ),
    })),

  updateQuantity: (variantId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter(
              (item) => item.variantId !== variantId,
            )
          : state.items.map((item) =>
              item.variantId === variantId
                ? { ...item, quantity }
                : item,
            ),
    })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "hypercode-cart",
    },
  ),
);