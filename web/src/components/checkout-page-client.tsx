"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { checkoutCustomer } from "@/app/checkout/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/cart-provider";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(value);
}

export function CheckoutPageClient() {
  const { items, subtotal, clearCart } = useCart();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMode, setPaymentMode] = useState<"utang" | "cash">("utang");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const data = await checkoutCustomer({
        fullName,
        phone,
        deliveryAddress,
        paymentMode,
        notes,
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity
        }))
      });

      clearCart();
      setSuccess(`Order ${data.order.order_number} saved as ${paymentMode === "utang" ? "utang" : "paid"}.`);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to checkout.");
    } finally {
      setIsSaving(false);
    }
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold tracking-normal">Checkout Saved</h1>
        <p className="mt-3 text-muted-foreground">{success}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/user/utang">View Utang</Link>
        </Button>
      </main>
    );
  }

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
            <CardTitle>Checkout Details</CardTitle>
            <CardDescription>Submit this cart as cash or utang under your customer account.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
            {success ? <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{success}</div> : null}
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <Input placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              <Input placeholder="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} />
              <Input placeholder="Pickup or delivery note" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} />
              <label className="grid gap-2 text-sm font-medium">
                Payment Mode
                <select
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value as "utang" | "cash")}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="utang">Utang</option>
                  <option value="cash">Cash</option>
                </select>
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Notes"
              />
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : paymentMode === "utang" ? "Checkout as Utang" : "Place Cash Order"}
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
