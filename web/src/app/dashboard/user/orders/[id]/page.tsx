import Link from "next/link";
import { notFound } from "next/navigation";

import { loadCustomerOrderDetail } from "@/app/dashboard/user/orders/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardPagination } from "@/components/dashboard-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CustomerOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value));
}

export default async function CustomerOrderDetailPage({
  params,
  searchParams
}: CustomerOrderDetailPageProps & {
  searchParams: Promise<{ itemPage?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  let data: Awaited<ReturnType<typeof loadCustomerOrderDetail>>;

  try {
    data = await loadCustomerOrderDetail(id, Number(query.itemPage) || 1, 10);
  } catch (error) {
    if (error instanceof Error && error.message === "Order not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Customer", href: "/dashboard/user" }, { label: data.order.order_number }]} />
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-normal">{data.order.order_number}</h1>
          <p className="mt-2 text-muted-foreground">
            Status: <span className="capitalize">{data.order.order_status}</span> · Payment:{" "}
            <span className="capitalize">{data.order.payment_status}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/user/utang">Back to Utang</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>This is the latest item list saved by the store admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-md border p-4 sm:grid-cols-[1fr_80px_120px_120px] sm:items-center">
              <span className="text-sm font-medium">{item.product_name}</span>
              <span className="text-sm text-muted-foreground">x{item.quantity}</span>
              <span className="text-sm">{money(item.unit_price)}</span>
              <span className="text-sm font-semibold sm:text-right">
                {money(Number(item.quantity) * Number(item.unit_price))}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-4 text-lg font-bold">
            <span>Total</span>
            <span>{money(data.order.total)}</span>
          </div>
          <DashboardPagination
            path={`/dashboard/user/orders/${id}`}
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            pageParam="itemPage"
          />
        </CardContent>
      </Card>
    </main>
  );
}
