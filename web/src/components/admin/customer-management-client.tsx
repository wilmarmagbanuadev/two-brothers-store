"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Edit, Save, Search, UserPlus, Users, X } from "lucide-react";

import {
  AdminCustomer,
  createAdminCustomer,
  loadAdminCustomers,
  updateAdminCustomer
} from "@/app/dashboard/admin/customers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CustomerForm = {
  originalEmail?: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  status: "active" | "suspended" | "archived";
};

const emptyForm: CustomerForm = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  status: "active"
};

function displayName(customer: AdminCustomer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.email;
}

function customerToForm(customer: AdminCustomer): CustomerForm {
  return {
    originalEmail: customer.email,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    password: "",
    status: customer.status === "suspended" || customer.status === "archived" ? customer.status : "active"
  };
}

export function CustomerManagementClient() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended" | "archived">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditing = Boolean(form.originalEmail);
  const firstItem = pagination.totalItems ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const lastItem = Math.min(pagination.page * pagination.limit, pagination.totalItems);
  const activeOnPage = useMemo(
    () => customers.filter((customer) => customer.status === "active").length,
    [customers]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await loadAdminCustomers({
        page,
        limit,
        status,
        search: debouncedSearch
      });

      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load customers.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, limit, page, status]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFormOpen]);

  function openCreateForm() {
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setIsFormOpen(true);
  }

  function openEditForm(customer: AdminCustomer) {
    setForm(customerToForm(customer));
    setError("");
    setSuccess("");
    setIsFormOpen(true);
  }

  function closeForm() {
    if (!isSaving) {
      setIsFormOpen(false);
      setForm(emptyForm);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const payload = {
        originalEmail: form.originalEmail,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password || undefined,
        status: form.status
      };

      if (isEditing) {
        await updateAdminCustomer(payload);
      } else {
        await createAdminCustomer(payload);
      }

      setSuccess(isEditing ? "Customer updated." : "Customer added.");
      setIsFormOpen(false);
      setForm(emptyForm);
      await loadCustomers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save customer.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {error && !isFormOpen ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {success}
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Customer Users</CardTitle>
            <CardDescription>
              {pagination.totalItems} customers, {activeOnPage} active on this page
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreateForm}>
            <UserPlus className="h-4 w-4" />
            Add Customer
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "active", "suspended", "archived"] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  size="sm"
                  variant={status === filter ? "default" : "outline"}
                  onClick={() => {
                    setStatus(filter);
                    setPage(1);
                  }}
                  className="capitalize"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.email} className="border-t">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {displayName(customer)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
                    <td className="px-4 py-3">Customer</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs capitalize">
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEditForm(customer)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && !customers.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No Customer users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground">
              {isLoading ? "Loading customers..." : `Showing ${firstItem}-${lastItem} of ${pagination.totalItems}`}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Customers per page"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-20 text-center">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={page >= pagination.totalPages || isLoading}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isFormOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-form-title"
            className="w-full max-w-xl rounded-lg border bg-background shadow-xl"
          >
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h2 id="customer-form-title" className="text-xl font-semibold">
                  {isEditing ? "Edit Customer" : "Add Customer"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Directus role: Customer</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeForm} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
              {error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  First Name
                  <Input
                    value={form.firstName}
                    onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                    autoComplete="given-name"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Last Name
                  <Input
                    value={form.lastName}
                    onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                    autoComplete="family-name"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Email
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                {isEditing ? "New Password (optional)" : "Password"}
                <Input
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  autoComplete="new-password"
                  required={!isEditing}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as CustomerForm["status"]
                    }))
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <div className="mt-2 flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Customer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
