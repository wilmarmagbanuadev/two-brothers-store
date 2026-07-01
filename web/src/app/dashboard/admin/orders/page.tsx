import { Breadcrumbs } from "@/components/breadcrumbs";
import { OrderManagementClient } from "@/components/admin/order-management-client";

export default function AdminOrdersPage() {
  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Admin", href: "/dashboard/admin" }, { label: "Orders" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Orders</h1>
        <p className="mt-2 text-muted-foreground">Create store orders and choose whether the customer pays now or lists it as utang.</p>
      </div>

      <OrderManagementClient />
    </main>
  );
}
