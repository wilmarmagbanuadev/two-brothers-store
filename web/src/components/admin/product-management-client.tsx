"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CircleDollarSign,
  ClipboardList,
  Edit,
  Filter,
  ImageOff,
  MoreVertical,
  Package,
  PackagePlus,
  Plus,
  Save,
  Search,
  ShoppingBag,
  X
} from "lucide-react";

import {
  createAdminProduct,
  loadAdminProductOfflineCatalog,
  loadAdminProducts,
  updateAdminProduct
} from "@/app/dashboard/admin/products/actions";
import { checkStoreServiceConnection } from "@/app/connection-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adminProductCatalogSnapshotKey,
  cacheAdminProductImages,
  loadAdminSnapshot,
  saveAdminSnapshot
} from "@/lib/admin-offline";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
};

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: string | number;
  image_url: string | null;
  is_featured: boolean;
  status: "draft" | "active" | "archived";
  stock_quantity: number;
  category_id: AdminCategory | null;
};

type ProductFormState = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  image_url: string;
  is_featured: boolean;
  status: "draft" | "active" | "archived";
  stock_quantity: string;
  category_id: string;
};

type ProductsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalProducts: number;
  totalPages: number;
};

type OfflineProductCatalog = {
  products: AdminProduct[];
  categories: AdminCategory[];
  updatedAt: string;
};

const emptyForm: ProductFormState = {
  name: "",
  slug: "",
  sku: "",
  barcode: "",
  description: "",
  price: "",
  image_url: "",
  is_featured: false,
  status: "active",
  stock_quantity: "0",
  category_id: ""
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value));
}

function productToForm(product: AdminProduct): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    description: product.description ?? "",
    price: String(product.price),
    image_url: product.image_url ?? "",
    is_featured: product.is_featured,
    status: product.status,
    stock_quantity: String(product.stock_quantity ?? 0),
    category_id: product.category_id?.id ?? ""
  };
}

function offlineProductPage(
  catalog: OfflineProductCatalog,
  options: {
    page: number;
    limit: number;
    search: string;
    status: "all" | AdminProduct["status"];
  }
) {
  const normalizedSearch = options.search.trim().toLowerCase();
  const filtered = catalog.products.filter((product) => {
    const matchesStatus = options.status === "all" || product.status === options.status;
    const matchesSearch = !normalizedSearch || [
      product.name,
      product.slug,
      product.sku ?? "",
      product.barcode ?? "",
      product.category_id?.name ?? ""
    ].some((value) => value.toLowerCase().includes(normalizedSearch));

    return matchesStatus && matchesSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / options.limit));
  const safePage = Math.min(Math.max(1, options.page), totalPages);
  const offset = (safePage - 1) * options.limit;

  return {
    products: filtered.slice(offset, offset + options.limit),
    categories: catalog.categories,
    pagination: {
      page: safePage,
      limit: options.limit,
      totalItems: filtered.length,
      totalProducts: catalog.products.length,
      totalPages
    }
  };
}

export function ProductManagementClient() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminProduct["status"]>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<ProductsPagination>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalProducts: 0,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [error, setError] = useState("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const catalogRefreshStarted = useRef(false);

  const isEditing = Boolean(form.id);

  const activeProducts = useMemo(() => products.filter((product) => product.status === "active").length, [products]);
  const draftProducts = useMemo(() => products.filter((product) => product.status === "draft").length, [products]);
  const totalStock = useMemo(() => products.reduce((total, product) => total + Number(product.stock_quantity ?? 0), 0), [products]);
  const totalValue = useMemo(
    () => products.reduce((total, product) => total + Number(product.price) * Number(product.stock_quantity ?? 0), 0),
    [products]
  );
  const firstItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(pagination.page * pagination.limit, pagination.totalItems);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const isStoreOnline = navigator.onLine && await checkStoreServiceConnection();

      if (!isStoreOnline) {
        throw new Error("The store service is unavailable.");
      }

      const data = await loadAdminProducts({
        page,
        limit: pageSize,
        status: statusFilter,
        search: searchQuery.trim()
      });

      setProducts(data.products);
      setCategories(data.categories);
      setPagination(data.pagination);
      setIsOfflineMode(false);

      if (!catalogRefreshStarted.current) {
        catalogRefreshStarted.current = true;

        try {
          const catalog = await loadAdminProductOfflineCatalog();

          await saveAdminSnapshot<OfflineProductCatalog>(adminProductCatalogSnapshotKey, catalog);
          void cacheAdminProductImages(catalog.products.map((product) => product.image_url));
        } catch {
          catalogRefreshStarted.current = false;
        }
      }
    } catch (loadError) {
      const catalog = await loadAdminSnapshot<OfflineProductCatalog>(adminProductCatalogSnapshotKey);

      if (catalog) {
        const data = offlineProductPage(catalog, {
          page,
          limit: pageSize,
          status: statusFilter,
          search: searchQuery
        });

        setProducts(data.products);
        setCategories(data.categories);
        setPagination(data.pagination);
        setIsOfflineMode(true);
      } else {
        setError(loadError instanceof Error ? loadError.message : "Unable to load products.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeProductForm();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFormOpen]);

  function updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));

    if (key === "image_url") {
      setImagePreviewFailed(false);
    }
  }

  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: current.id ? current.slug : slugify(value)
    }));
  }

  function openCreateProduct() {
    setForm(emptyForm);
    setError("");
    setImagePreviewFailed(false);
    setIsFormOpen(true);
  }

  function openEditProduct(product: AdminProduct) {
    setForm(productToForm(product));
    setError("");
    setImagePreviewFailed(false);
    setIsFormOpen(true);
  }

  function closeProductForm() {
    setIsFormOpen(false);
    setForm(emptyForm);
    setImagePreviewFailed(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image_url: form.image_url.trim(),
      is_featured: form.is_featured,
      status: form.status,
      stock_quantity: Number(form.stock_quantity),
      category_id: form.category_id || null
    };

    try {
      if (!(navigator.onLine && await checkStoreServiceConnection())) {
        setError("Reconnect before adding or editing products.");
        return;
      }

      if (form.id) {
        await updateAdminProduct(form.id, payload);
      } else {
        await createAdminProduct(payload);
      }

      setForm(emptyForm);
      setIsFormOpen(false);
      catalogRefreshStarted.current = false;
      await loadProducts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save product.");
    } finally {
      setIsSaving(false);
    }
  }

  function statusClass(status: AdminProduct["status"]) {
    if (status === "active") {
      return "bg-primary/10 text-primary";
    }

    if (status === "draft") {
      return "bg-muted text-muted-foreground";
    }

    return "bg-secondary text-secondary-foreground";
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted/35 p-2 sm:p-3">
      <section className="grid w-full min-w-0 max-w-full gap-4">
            <div className="flex min-w-0 flex-col gap-3 rounded-md border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-normal">Products</h2>
                <p className="text-sm text-muted-foreground">Manage inventory, pricing, status, and storefront visibility.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm">
                  Export
                </Button>
                <Button type="button" size="sm" onClick={openCreateProduct} disabled={isOfflineMode}>
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total Products", value: pagination.totalProducts, icon: Package, note: `${pagination.totalItems} matching` },
                { label: "Page Value", value: money(totalValue), icon: CircleDollarSign, note: "Shown on this page" },
                { label: "Page Stock", value: totalStock, icon: ShoppingBag, note: "Shown on this page" },
                { label: "Page Drafts", value: draftProducts, icon: ClipboardList, note: `${activeProducts} active shown` }
              ].map((stat) => {
                const Icon = stat.icon;

                return (
                  <Card key={stat.label} className="min-w-0 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</CardTitle>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="min-w-0">
              <CardHeader className="min-w-0 gap-4 border-b p-4 sm:p-6">
                <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative min-w-0 md:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search by product, slug, SKU, or barcode"
                      className="pl-9"
                    />
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-2 min-[420px]:flex min-[420px]:flex-wrap min-[420px]:items-center">
                    <Button type="button" variant="outline" size="sm">
                      <Filter className="h-4 w-4" />
                      Filter
                    </Button>
                    {(["all", "active", "draft", "archived"] as const).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={statusFilter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setStatusFilter(status);
                          setPage(1);
                        }}
                        className="capitalize"
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 p-0">
                {error ? (
                  <div className="m-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <p>{error}</p>
                    {error.toLowerCase().includes("login") ? (
                      <Link href="/sign-in/admin" className="mt-2 inline-block font-medium underline">
                        Go to admin login
                      </Link>
                    ) : null}
                  </div>
                ) : null}
                {isOfflineMode ? (
                  <div className="m-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Showing saved products. Reconnect to add or edit inventory.
                  </div>
                ) : null}
                {isLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Loading products...</p>
                ) : (
                  <>
                    <div className="grid w-full min-w-0 max-w-full gap-3 p-3 sm:p-4 md:hidden">
                      {products.map((product) => (
                        <div key={product.id} className="w-full min-w-0 max-w-full overflow-hidden rounded-md border p-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt=""
                                  width={48}
                                  height={48}
                                  unoptimized
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{product.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{product.slug}</div>
                              <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClass(product.status)}`}>
                                {product.status}
                              </span>
                            </div>
                          </div>

                          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 text-sm">
                            <div className="min-w-0">
                              <dt className="text-xs text-muted-foreground">SKU</dt>
                              <dd className="truncate">{product.sku || "-"}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-xs text-muted-foreground">Barcode</dt>
                              <dd className="truncate">{product.barcode || "-"}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-xs text-muted-foreground">Category</dt>
                              <dd className="truncate">{product.category_id?.name ?? "Uncategorized"}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">Stock</dt>
                              <dd>{product.stock_quantity}</dd>
                            </div>
                          </dl>

                          <div className="mt-3 flex items-center justify-between border-t pt-3">
                            <span className="font-semibold">{money(product.price)}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              onClick={() => openEditProduct(product)}
                              disabled={isOfflineMode}
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!products.length ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">No products found.</p>
                      ) : null}
                    </div>
                    <div className="hidden max-w-full overflow-x-auto md:block">
                      <table className="w-full min-w-[1050px] text-left text-sm">
                        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                          <tr>
                            <th className="w-10 px-4 py-3 font-medium">
                              <input type="checkbox" aria-label="Select all products" />
                            </th>
                            <th className="px-4 py-3 font-medium">Product Name</th>
                            <th className="px-4 py-3 font-medium">SKU</th>
                            <th className="px-4 py-3 font-medium">Barcode</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium">Price</th>
                            <th className="px-4 py-3 font-medium">Stock</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 text-right font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {products.map((product) => (
                            <tr key={product.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <input type="checkbox" aria-label={`Select ${product.name}`} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                                    {product.image_url ? (
                                      <Image
                                        src={product.image_url}
                                        alt=""
                                        width={40}
                                        height={40}
                                        unoptimized
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">{product.slug}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{product.sku || "-"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{product.barcode || "-"}</td>
                              <td className="px-4 py-3">{product.category_id?.name ?? "Uncategorized"}</td>
                              <td className="px-4 py-3">{money(product.price)}</td>
                              <td className="px-4 py-3">{product.stock_quantity}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClass(product.status)}`}>
                                  {product.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditProduct(product)}
                                    disabled={isOfflineMode}
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Button>
                                  <Button type="button" size="icon" variant="ghost" aria-label="More actions">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!products.length ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No products found.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        Showing {firstItem}-{lastItem} of {pagination.totalItems}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2">
                          Rows
                          <select
                            value={pageSize}
                            onChange={(event) => {
                              setPageSize(Number(event.target.value));
                              setPage(1);
                            }}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                          >
                            {[5, 10, 20, 50].map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span>
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button type="button" variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pagination.page >= pagination.totalPages}
                          onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button type="button" className="fixed inset-0 cursor-default" aria-label="Close product form" onClick={closeProductForm} />
          <Card className="relative mx-auto max-w-2xl shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5" />
                {isEditing ? "Edit Product" : "Add Product"}
              </CardTitle>
              <Button type="button" variant="ghost" size="icon" aria-label="Close product form" onClick={closeProductForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          ) : null}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Product Name
              <Input value={form.name} onChange={(event) => handleNameChange(event.target.value)} required />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Slug
              <Input value={form.slug} onChange={(event) => updateForm("slug", slugify(event.target.value))} required />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                SKU
                <Input value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} placeholder="SNACK-CURLS" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Barcode
                <Input value={form.barcode} onChange={(event) => updateForm("barcode", event.target.value)} placeholder="4800000000000" />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Category
              <select
                value={form.category_id}
                onChange={(event) => updateForm("category_id", event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Price
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateForm("price", event.target.value)} required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Stock
                <Input type="number" min="0" value={form.stock_quantity} onChange={(event) => updateForm("stock_quantity", event.target.value)} />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Image URL
              <Input value={form.image_url} onChange={(event) => updateForm("image_url", event.target.value)} placeholder="https://..." />
            </label>

            <div className="overflow-hidden rounded-md border bg-muted/30">
              {form.image_url && !imagePreviewFailed ? (
                <Image
                  src={form.image_url}
                  alt={form.name ? `${form.name} preview` : "Product image preview"}
                  width={800}
                  height={320}
                  unoptimized
                  className="h-48 w-full object-cover"
                  onError={() => setImagePreviewFailed(true)}
                />
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
                  <ImageOff className="h-8 w-8" />
                  <span>{form.image_url ? "Image preview unavailable. Check the URL." : "Image preview will appear here."}</span>
                </div>
              )}
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Description
              <textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Status
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value as ProductFormState["status"])}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) => updateForm("is_featured", event.target.checked)}
                />
                Featured
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Product"}
              </Button>
              <Button type="button" variant="outline" onClick={closeProductForm}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              {form.slug ? (
                <Button asChild type="button" variant="ghost">
                  <Link href={`/products/${form.slug}`}>View</Link>
                </Button>
              ) : null}
            </div>
          </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
