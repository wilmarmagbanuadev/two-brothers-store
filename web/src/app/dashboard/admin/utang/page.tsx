import { Breadcrumbs } from "@/components/breadcrumbs";
import { UtangManagementClient } from "@/components/admin/utang-management-client";

export default function AdminUtangPage() {
  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Admin", href: "/dashboard/admin" }, { label: "Utang" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Utang</h1>
        <p className="mt-2 text-muted-foreground">
          Track items listed under a customer name, then record weekly payments against their balance.
        </p>
      </div>

      <UtangManagementClient />
    </main>
  );
}
