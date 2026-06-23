"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/cart-provider";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function CheckoutPageClient() {
  const { items, subtotal, clearCart } = useCart();
  const deliveryFee = items.length > 0 ? 5 : 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold tracking-normal">No items to checkout</h1>
        <p className="mt-3 text-muted-foreground">Your cart needs at least one product.</p>
        <Button asChild className="mt-6">
          <Link href="/products">Browse products</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-normal">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
            <CardDescription>Enter customer and delivery information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4">
              <Input placeholder="Full name" />
              <Input type="email" placeholder="Email address" />
              <Input placeholder="Phone number" />
              <Input placeholder="Delivery address" />
              <Button type="button" onClick={clearCart}>
                Place Order
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} x {item.quantity}</span>
                <span>{item.price}</span>
              </div>
            ))}
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Delivery</span>
                <span>{money(deliveryFee)}</span>
              </div>
              <div className="mt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
