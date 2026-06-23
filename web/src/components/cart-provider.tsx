"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Product } from "@/lib/products";

export type CartItem = Product & {
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "two-brothers-cart";

function priceToNumber(price: string) {
  return Number(price.replace(/[^0-9.]/g, ""));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = window.localStorage.getItem(storageKey);
    if (savedCart) {
      setItems(JSON.parse(savedCart) as CartItem[]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => total + priceToNumber(item.price) * item.quantity, 0);

    return {
      items,
      itemCount,
      subtotal,
      addItem: (product) => {
        setItems((currentItems) => {
          const existingItem = currentItems.find((item) => item.id === product.id);

          if (existingItem) {
            return currentItems.map((item) =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
          }

          return [...currentItems, { ...product, quantity: 1 }];
        });
      },
      removeItem: (id) => {
        setItems((currentItems) => currentItems.filter((item) => item.id !== id));
      },
      updateQuantity: (id, quantity) => {
        setItems((currentItems) =>
          currentItems
            .map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
            .filter((item) => item.quantity > 0)
        );
      },
      clearCart: () => {
        setItems([]);
      }
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
