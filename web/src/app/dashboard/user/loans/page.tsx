import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserLoansPage() {
  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Customer", href: "/dashboard/user" }, { label: "Loans" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Loans</h1>
        <p className="mt-2 text-muted-foreground">Track customer loan records related to your account.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Loan Records</CardTitle>
          <CardDescription>Any customer loan records will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No loan records yet.</p>
        </CardContent>
      </Card>
    </main>
  );
}
