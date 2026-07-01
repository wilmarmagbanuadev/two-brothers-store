import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const stats = [
  { label: "Open Utang", value: "Track", note: "Customer balances" },
  { label: "Products", value: "Open", note: "Manage catalog" },
  { label: "Customers", value: "New", note: "View customer list" },
  { label: "Payments", value: "Weekly", note: "Record collections" }
];

export default function AdminDashboardPage() {
  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Admin" }]} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Overview</h1>
        <p className="mt-2 text-muted-foreground">Use the admin menu to manage products, utang, customers, and store operations.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-sm text-muted-foreground">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
