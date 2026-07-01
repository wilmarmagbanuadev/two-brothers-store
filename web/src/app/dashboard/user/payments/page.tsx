import { loadCustomerPaymentsPage } from "@/app/dashboard/user/orders/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardPagination } from "@/components/dashboard-pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function UserPaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const ledger = await loadCustomerPaymentsPage(Number(query.page) || 1, 10);

  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Customer", href: "/dashboard/user" }, { label: "Payments" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Payments</h1>
        <p className="mt-2 text-muted-foreground">View payments made against your balance.</p>
      </div>
      <div className="mb-6 max-w-sm">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase text-muted-foreground">Balance</p>
            <p className="mt-2 text-2xl font-bold">{money(ledger.balance)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Payments recorded against your confirmed utang orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Received By</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.payments.map((payment) => (
                  <tr key={payment.id} className="border-t">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3 capitalize">
                      {(payment.payment_method || "cash").replace("_", " ")}
                    </td>
                    <td className="px-4 py-3">{payment.received_by || "-"}</td>
                    <td className="max-w-72 truncate px-4 py-3 text-muted-foreground">{payment.notes || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(payment.amount)}</td>
                  </tr>
                ))}
                {!ledger.payments.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <DashboardPagination
            path="/dashboard/user/payments"
            page={ledger.pagination.page}
            totalPages={ledger.pagination.totalPages}
          />
        </CardContent>
      </Card>
    </main>
  );
}
