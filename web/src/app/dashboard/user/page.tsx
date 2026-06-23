import Link from "next/link";
import { Heart, MapPin, PackageCheck, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const userStats = [
  { label: "To Receive", value: "2", icon: PackageCheck },
  { label: "Cart Items", value: "Open cart", icon: ShoppingCart },
  { label: "Saved Items", value: "8", icon: Heart },
  { label: "Address", value: "Murcia", icon: MapPin }
];

const orders = [
  { id: "TB-1008", item: "Premium Rice 1kg", status: "Preparing", total: "₱62.00" },
  { id: "TB-1007", item: "Coca-Cola Family Bottle", status: "For pickup", total: "₱95.00" },
  { id: "TB-1006", item: "Sardines in Tomato Sauce", status: "Completed", total: "₱28.00" }
];

export default function UserDashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Customer</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">User Dashboard</h1>
          <p className="mt-2 text-muted-foreground">A Shopee-style place for orders, cart, and account activity.</p>
        </div>
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {userStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
            <CardDescription>Track recent orders and pickup status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="grid gap-2 rounded-md border p-4 sm:grid-cols-[120px_1fr_120px_100px] sm:items-center">
                <span className="text-sm font-medium">{order.id}</span>
                <span className="text-sm text-muted-foreground">{order.item}</span>
                <span className="text-sm">{order.status}</span>
                <span className="text-sm font-semibold sm:text-right">{order.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild variant="outline">
              <Link href="/cart">View Cart</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/checkout">Go to Checkout</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products?category=Rice">Buy Rice</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
