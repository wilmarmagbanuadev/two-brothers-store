import { DollarSign, Package, ShoppingCart, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Revenue", value: "₱12,480", icon: DollarSign },
  { label: "Orders", value: "328", icon: ShoppingCart },
  { label: "Products", value: "84", icon: Package },
  { label: "Customers", value: "1,248", icon: Users }
];

const recentOrders = [
  "Order #1048 - Premium Rice 1kg",
  "Order #1047 - Coca-Cola Family Bottle",
  "Order #1046 - Shampoo Sachet",
  "Order #1045 - Cheese Curls Pack"
];

const inventory = [
  { label: "Soft Drinks", value: 82 },
  { label: "Rice", value: 68 },
  { label: "Canned Goods", value: 74 },
  { label: "Toiletries", value: 56 }
];

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Store performance, inventory, customers, and latest order activity.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Watch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventory.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span>{item.value}% stocked</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order} className="rounded-md border px-3 py-2 text-sm">
                  {order}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
