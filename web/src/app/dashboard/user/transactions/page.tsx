import Link from "next/link";
import { Banknote, ReceiptText } from "lucide-react";

import { loadCustomerTransactionsPage } from "@/app/dashboard/user/orders/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardPagination } from "@/components/dashboard-pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function UserTransactionsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const data = await loadCustomerTransactionsPage(Number(query.page) || 1, 10);
  const transactions = data.transactions;

  return (
    <main className="py-10">
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Customer", href: "/dashboard/user" }, { label: "Transactions" }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Transactions</h1>
        <p className="mt-2 text-muted-foreground">Review purchases, payments, and account activity.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Confirmed utang charges and payments recorded on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 text-right font-medium">Charge</th>
                  <th className="px-4 py-3 text-right font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(transaction.date)}</td>
                    <td className="px-4 py-3">
                      {transaction.type === "order" ? (
                        <Link
                          href={`/dashboard/user/orders/${transaction.recordId}`}
                          className="inline-flex items-center gap-2 font-medium hover:text-primary"
                        >
                          <ReceiptText className="h-4 w-4 text-muted-foreground" />
                          {transaction.title}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-2 font-medium">
                          <Banknote className="h-4 w-4 text-primary" />
                          {transaction.title}
                        </span>
                      )}
                    </td>
                    <td className="max-w-80 truncate px-4 py-3 capitalize text-muted-foreground">
                      {transaction.detail}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {transaction.charge ? money(transaction.charge) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-primary">
                      {transaction.payment ? money(transaction.payment) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{money(transaction.balance)}</td>
                  </tr>
                ))}
                {!transactions.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No account transactions yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <DashboardPagination
            path="/dashboard/user/transactions"
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
          />
        </CardContent>
      </Card>
    </main>
  );
}
