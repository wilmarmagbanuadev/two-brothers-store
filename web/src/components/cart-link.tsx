"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/cart">
        <ShoppingCart className="h-4 w-4" />
        Cart
        {itemCount > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{itemCount}</span> : null}
      </Link>
    </Button>
  );
}
