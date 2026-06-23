"use client";

import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/products";

export function AddToCartButton({
  product,
  size = "default",
  className
}: {
  product: Product;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { addItem } = useCart();

  return (
    <Button size={size} className={className} onClick={() => addItem(product)}>
      <ShoppingCart className="h-4 w-4" />
      Add to Cart
    </Button>
  );
}
