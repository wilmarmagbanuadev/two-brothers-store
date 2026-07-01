"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Banknote, ChevronLeft, ChevronRight, CircleDollarSign, Search } from "lucide-react";

import {
  AdminPaymentHistory,
  CustomerLedger,
  loadAdminUtangData,
  recordCustomerPayment,
  searchAdminPaymentCustomers
} from "@/app/dashboard/admin/utang/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(value);
}

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function UtangManagementClient() {
  const [ledgers, setLedgers] = useState<CustomerLedger[]>([]);
  const [paymentCustomerOptions, setPaymentCustomerOptions] = useState<CustomerLedger[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<CustomerLedger | null>(null);
  const [payments, setPayments] = useState<AdminPaymentHistory[]>([]);
  const [customerEmail, setCustomerEmail] = useState("");
  const [balanceSearch, setBalanceSearch] = useState("");
  const [debouncedBalanceSearch, setDebouncedBalanceSearch] = useState("");
  const [paymentCustomerSearch, setPaymentCustomerSearch] = useState("");
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(localDateTimeValue);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [balancePage, setBalancePage] = useState(1);
  const [balanceLimit, setBalanceLimit] = useState(10);
  const [balancePagination, setBalancePagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentLimit, setPaymentLimit] = useState(10);
  const [paymentPagination, setPaymentPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });

  function selectPaymentCustomer(ledger: CustomerLedger, useFullBalance = false) {
    setSelectedLedger(ledger);
    setCustomerEmail(ledger.email);
    setPaymentCustomerSearch(`${ledger.name} - ${ledger.email}`);
    setAmount(useFullBalance ? ledger.balance.toFixed(2) : "");
    setIsCustomerMenuOpen(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBalanceSearch(balanceSearch.trim());
      setBalancePage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [balanceSearch]);

  useEffect(() => {
    if (!isCustomerMenuOpen) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPaymentCustomerOptions(await searchAdminPaymentCustomers(paymentCustomerSearch));
      } catch {
        setPaymentCustomerOptions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isCustomerMenuOpen, paymentCustomerSearch]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await loadAdminUtangData({
        balancePage,
        balanceLimit,
        balanceSearch: debouncedBalanceSearch,
        paymentPage,
        paymentLimit
      });
      setLedgers(data.ledgers);
      setPayments(data.paymentHistory);
      setTotalBalance(data.totalBalance);
      setBalancePagination(data.balancePagination);
      setPaymentPagination(data.paymentPagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load customer balances.");
    } finally {
      setIsLoading(false);
    }
  }, [balanceLimit, balancePage, debouncedBalanceSearch, paymentLimit, paymentPage]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const result = await recordCustomerPayment({
        customerEmail,
        amount: Number(amount),
        paymentDate,
        paymentMethod,
        receivedBy,
        notes
      });

      setSuccess(
        `Payment recorded. ${money(result.allocatedAmount)} applied; ${money(result.remainingBalance)} remains.`
      );
      setCustomerEmail("");
      setPaymentCustomerSearch("");
      setSelectedLedger(null);
      setAmount("");
      setNotes("");
      setPaymentDate(localDateTimeValue());
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to record payment.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {success}
        </div>
      ) : null}

      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Balance to Collect</p>
              <p className="mt-2 text-2xl font-bold">{money(totalBalance)}</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="order-2 min-w-0 xl:order-1">
          <CardHeader>
            <CardTitle>Customer Balances</CardTitle>
            <CardDescription>Confirmed utang orders with payments applied oldest first.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="relative mb-4 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                value={balanceSearch}
                onChange={(event) => setBalanceSearch(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 pl-9 text-sm"
                placeholder="Search customer"
                aria-label="Search customer balances"
              />
            </div>
            <div className="grid gap-2 md:hidden">
              {ledgers.map((ledger) => (
                <div key={ledger.email} className="rounded-md border p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{ledger.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{ledger.email}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold">{money(ledger.balance)}</div>
                      <div className="text-xs text-muted-foreground">{ledger.openOrders} open</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    disabled={ledger.balance <= 0}
                    onClick={() => selectPaymentCustomer(ledger, true)}
                  >
                    Record Payment
                  </Button>
                </div>
              ))}
              {!isLoading && !ledgers.length ? (
                <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
                  {balanceSearch.trim() ? "No matching customers found." : "No confirmed utang accounts yet."}
                </p>
              ) : null}
            </div>
            <div className="hidden max-w-full overflow-x-auto rounded-md border md:block">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Orders</th>
                    <th className="px-4 py-3 text-right font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgers.map((ledger) => (
                    <tr key={ledger.email} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{ledger.name}</div>
                        <div className="text-xs text-muted-foreground">{ledger.email}</div>
                      </td>
                      <td className="px-4 py-3">{ledger.openOrders} open</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(ledger.balance)}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={ledger.balance <= 0}
                          onClick={() => selectPaymentCustomer(ledger, true)}
                        >
                          Pay
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && !ledgers.length ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        {balanceSearch.trim() ? "No matching customers found." : "No confirmed utang accounts yet."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading balances...</p> : null}
            <div className="mt-4 flex items-center justify-between gap-2">
              <select
                value={balanceLimit}
                onChange={(event) => {
                  setBalanceLimit(Number(event.target.value));
                  setBalancePage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Balances per page"
              >
                {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size} per page</option>)}
              </select>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" aria-label="Previous balances page" disabled={balancePage <= 1 || isLoading} onClick={() => setBalancePage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-20 text-center text-sm">{balancePagination.page} / {balancePagination.totalPages}</span>
                <Button type="button" variant="outline" size="icon" aria-label="Next balances page" disabled={balancePage >= balancePagination.totalPages || isLoading} onClick={() => setBalancePage((current) => Math.min(balancePagination.totalPages, current + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 min-w-0 h-fit xl:order-2">
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
            <CardDescription>Apply a full or partial payment to the oldest open orders.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium">
                Customer
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    value={paymentCustomerSearch}
                    onFocus={() => setIsCustomerMenuOpen(true)}
                    onBlur={() => setTimeout(() => setIsCustomerMenuOpen(false), 150)}
                    onChange={(event) => {
                      setPaymentCustomerSearch(event.target.value);
                      setCustomerEmail("");
                      setSelectedLedger(null);
                      setAmount("");
                      setIsCustomerMenuOpen(true);
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 pl-9 text-sm"
                    placeholder="Search customer"
                    role="combobox"
                    aria-expanded={isCustomerMenuOpen}
                    aria-controls="payment-customer-options"
                    autoComplete="off"
                    required
                  />
                  {isCustomerMenuOpen ? (
                    <div
                      id="payment-customer-options"
                      role="listbox"
                      className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-background shadow-lg"
                    >
                      {paymentCustomerOptions.map((ledger) => (
                        <button
                          key={ledger.email}
                          type="button"
                          role="option"
                          aria-selected={ledger.email === customerEmail}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPaymentCustomer(ledger)}
                          className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{ledger.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{ledger.email}</span>
                          </span>
                          <span className="shrink-0 font-medium">{money(ledger.balance)}</span>
                        </button>
                      ))}
                      {!paymentCustomerOptions.length ? (
                        <div className="px-3 py-3 text-sm text-muted-foreground">
                          No customers with a balance found.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedLedger?.balance}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  required
                />
                {selectedLedger ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    Remaining balance: {money(selectedLedger.balance)}
                  </span>
                ) : null}
              </label>

              <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-1">
                <label className="grid gap-2 text-sm font-medium">
                  Payment Date
                  <input
                    type="datetime-local"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Method
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Received By
                <input
                  value={receivedBy}
                  onChange={(event) => setReceivedBy(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="Name of collector"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Reference or payment details"
                />
              </label>

              <Button type="submit" disabled={isSaving || !selectedLedger || selectedLedger.balance <= 0}>
                <Banknote className="h-4 w-4" />
                {isSaving ? "Recording..." : "Record Payment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Recently recorded customer payments.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="grid gap-2 md:hidden">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{payment.customerName}</div>
                    <div className="truncate text-xs text-muted-foreground">{payment.customerEmail}</div>
                  </div>
                  <span className="shrink-0 font-semibold">{money(payment.amount)}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Date</dt>
                    <dd>{formatDate(payment.paymentDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Method</dt>
                    <dd className="capitalize">{payment.paymentMethod.replace("_", " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Received By</dt>
                    <dd>{payment.receivedBy || "-"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Notes</dt>
                    <dd className="truncate">{payment.notes || "-"}</dd>
                  </div>
                </dl>
              </div>
            ))}
            {!isLoading && !payments.length ? (
              <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : null}
          </div>
          <div className="hidden max-w-full overflow-x-auto rounded-md border md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Received By</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(payment.paymentDate)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{payment.customerName}</div>
                      <div className="text-xs text-muted-foreground">{payment.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{payment.paymentMethod.replace("_", " ")}</td>
                    <td className="px-4 py-3">{payment.receivedBy || "-"}</td>
                    <td className="max-w-72 truncate px-4 py-3 text-muted-foreground">{payment.notes || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(payment.amount)}</td>
                  </tr>
                ))}
                {!isLoading && !payments.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <select
              value={paymentLimit}
              onChange={(event) => {
                setPaymentLimit(Number(event.target.value));
                setPaymentPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Payments per page"
            >
              {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size} per page</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Previous payments page" disabled={paymentPage <= 1 || isLoading} onClick={() => setPaymentPage((current) => Math.max(1, current - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-20 text-center text-sm">{paymentPagination.page} / {paymentPagination.totalPages}</span>
              <Button type="button" variant="outline" size="icon" aria-label="Next payments page" disabled={paymentPage >= paymentPagination.totalPages || isLoading} onClick={() => setPaymentPage((current) => Math.min(paymentPagination.totalPages, current + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
