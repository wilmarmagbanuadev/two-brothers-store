import Link from "next/link";
import { Heart, MapPin, PackageCheck, ShoppingCart } from "lucide-react";

import { loadCustomerOrdersPage } from "@/app/dashboard/user/orders/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardPagination } from "@/components/dashboard-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value));
}

export default async function UserDashboardPage({
  searchParams
}: {
  searchParams: Promise<{ ordersPage?: string }>;
}) {
  const query = await searchParams;
  const requestedPage = Number(query.ordersPage) || 1;
  let orderData;

  try {
    orderData = await loadCustomerOrdersPage({
      page: requestedPage,
      limit: 5
    });
  } catch {
    orderData = {
      orders: [],
      pagination: {
        page: requestedPage,
        limit: 5,
        totalItems: 0,
        totalPages: 1
      }
    };
  }

  const orders = orderData.orders;
  const pendingCount = orders.filter((order) => order.order_status !== "completed" && order.order_status !== "cancelled").length;
  const utangCount = orders.filter((order) => order.payment_mode === "utang" && order.payment_status === "unpaid").length;
  const userStats = [
    { label: "To Receive", value: String(pendingCount), icon: PackageCheck },
    { label: "Cart Items", value: "Open cart", icon: ShoppingCart },
    { label: "Open Utang", value: String(utangCount), icon: Heart },
    { label: "Address", value: "Murcia", icon: MapPin }
  ];

  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Customer" }]} />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-normal">Overview</h1>
          <p className="mt-2 text-muted-foreground">Track your orders, cart, and account activity.</p>
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
            <CardDescription>Open an order to see the latest item list and pickup status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/user/orders/${order.id}`}
                className="grid gap-2 rounded-md border p-4 hover:bg-muted/30 sm:grid-cols-[120px_1fr_120px_100px] sm:items-center"
              >
                <span className="text-sm font-medium">{order.order_number}</span>
                <span className="text-sm text-muted-foreground capitalize">{order.payment_mode} order</span>
                <span className="text-sm capitalize">{order.order_status}</span>
                <span className="text-sm font-semibold sm:text-right">{money(order.total)}</span>
              </Link>
            ))}
            {!orders.length ? <p className="text-sm text-muted-foreground">No orders yet.</p> : null}
            <DashboardPagination
              path="/dashboard/user"
              page={orderData.pagination.page}
              totalPages={orderData.pagination.totalPages}
              pageParam="ordersPage"
            />
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
              <Link href="/dashboard/user/utang">View Utang</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
