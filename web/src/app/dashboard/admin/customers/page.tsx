import { Breadcrumbs } from "@/components/breadcrumbs";
import { CustomerManagementClient } from "@/components/admin/customer-management-client";

export default function AdminCustomersPage() {
  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Admin", href: "/dashboard/admin" }, { label: "Customers" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Customers</h1>
        <p className="mt-2 text-muted-foreground">Manage Directus users assigned to the Customer role.</p>
      </div>
      <CustomerManagementClient />
    </main>
  );
}
