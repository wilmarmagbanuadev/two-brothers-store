import Link from "next/link";

import { loadCustomerBalance, loadCustomerOrdersPage } from "@/app/dashboard/user/orders/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardPagination } from "@/components/dashboard-pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value));
}

export default async function UserUtangPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const [orderData, ledger] = await Promise.all([
    loadCustomerOrdersPage({
      page: Number(query.page) || 1,
      limit: 10,
      paymentMode: "utang"
    }),
    loadCustomerBalance()
  ]);
  const orders = orderData.orders;

  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Customer", href: "/dashboard/user" }, { label: "Utang" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Utang</h1>
        <p className="mt-2 text-muted-foreground">See items listed under your name and your current balance.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
          <CardDescription>Confirmed utang minus all recorded payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{money(ledger.balance)}</div>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Utang Orders</CardTitle>
          <CardDescription>Open an order to see the final item list after admin review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/user/orders/${order.id}`}
              className="grid gap-2 rounded-md border p-4 hover:bg-muted/30 sm:grid-cols-[120px_1fr_120px_100px] sm:items-center"
            >
              <span className="text-sm font-medium">{order.order_number}</span>
              <span className="text-sm capitalize text-muted-foreground">{order.order_status}</span>
              <span className="text-sm capitalize">{order.payment_status}</span>
              <span className="text-sm font-semibold sm:text-right">{money(order.total)}</span>
            </Link>
          ))}
          {!orders.length ? <p className="text-sm text-muted-foreground">No utang orders yet.</p> : null}
          <DashboardPagination
            path="/dashboard/user/utang"
            page={orderData.pagination.page}
            totalPages={orderData.pagination.totalPages}
          />
        </CardContent>
      </Card>
    </main>
  );
}
