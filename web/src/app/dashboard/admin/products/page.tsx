import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductManagementClient } from "@/components/admin/product-management-client";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <main className="py-10">
      <Breadcrumbs
        items={[
          { label: "Dashboard" },
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Products" }
        ]}
      />

      <div className="mb-8">
        <div>
          <p className="mt-2 text-muted-foreground">Add, edit, publish, and monitor products in the storefront catalog.</p>
        </div>
      </div>

      <ProductManagementClient />
    </main>
  );
}
