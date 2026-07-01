"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudOff,
  Minus,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";

import {
  loadAdminOrderData,
  loadAdminOrderForReview,
  removeAdminOrderItemFromCustomer,
  saveAdminOrder,
  updateAdminOrderItemQuantity,
  updateAdminOrderReview
} from "@/app/dashboard/admin/orders/actions";
import { checkStoreServiceConnection } from "@/app/connection-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminOfflineQueueEvent,
  adminOfflineSyncEvent,
  adminOrderCatalogSnapshotKey,
  loadAdminSnapshot,
  listQueuedAdminOrders,
  queueAdminOrder,
  removeQueuedAdminOrder,
  saveAdminSnapshot
} from "@/lib/admin-offline";
import type { QueuedAdminOrder } from "@/lib/admin-offline";

type CustomerUser = {
  email: string;
  first_name: string | null;
  last_name: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: string | number;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  payment_mode: "cash" | "utang";
  payment_status: string;
  order_status: string;
  total: string | number;
  notes: string | null;
};

type OrderLine = {
  productId: string;
  quantity: string;
};

type ReviewLine = {
  id: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
};

type AdminOrderCatalogSnapshot = {
  customers: CustomerUser[];
  products: Product[];
};

type AdminOrderPageSnapshot = {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

function queuedOrderRow(
  queued: QueuedAdminOrder,
  customers: CustomerUser[],
  products: Product[]
): Order {
  const customer = customers.find((entry) => entry.email === queued.payload.customerEmail);
  const total = queued.payload.items.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);

    return sum + (product ? Number(product.price) * Number(item.quantity) : 0);
  }, 0);

  return {
    id: `offline:${queued.clientReference}`,
    order_number: `Offline ${queued.clientReference.slice(0, 8)}`,
    customer_name: customer ? customerName(customer) : queued.payload.customerEmail,
    payment_mode: queued.payload.paymentMode,
    payment_status: queued.payload.paymentMode === "utang" ? "unpaid" : "paid",
    order_status: "waiting to sync",
    total,
    notes: queued.payload.notes?.trim() || null
  };
}

function queuedOrderItems(queued: QueuedAdminOrder, products: Product[]) {
  return queued.payload.items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const unitPrice = product ? Number(product.price) : 0;

    return {
      ...item,
      name: product?.name ?? "Saved product",
      sku: product?.sku,
      unitPrice,
      lineTotal: unitPrice * Number(item.quantity)
    };
  });
}

function mergeQueuedOrders(
  orders: Order[],
  queuedOrders: QueuedAdminOrder[],
  customers: CustomerUser[],
  products: Product[],
  page: number
) {
  if (page !== 1) {
    return orders;
  }

  const queuedRows = queuedOrders.map((queued) => queuedOrderRow(queued, customers, products));
  const queuedIds = new Set(queuedRows.map((order) => order.id));

  return [...queuedRows, ...orders.filter((order) => !queuedIds.has(order.id))];
}

function toReviewLine(item: {
  id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: string | number;
}) {
  return {
    id: item.id,
    productName: item.product_name,
    productSku: item.product_sku,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    lineTotal: Number(item.unit_price) * Number(item.quantity)
  };
}

function customerName(customer: CustomerUser) {
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || customer.email || "Customer";
}

function money(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value));
}

function QuantityStepper({
  value,
  onChange,
  onCommit,
  disabled = false,
  label
}: {
  value: string | number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const quantity = Math.max(1, Number(value) || 1);

  function update(nextValue: number, commit = false) {
    const nextQuantity = Math.max(1, nextValue);

    onChange(nextQuantity);
    if (commit) {
      onCommit?.(nextQuantity);
    }
  }

  return (
    <div className="flex h-10 w-full min-w-[112px] items-stretch">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-r-none"
        aria-label={`Decrease ${label}`}
        disabled={disabled || quantity <= 1}
        onClick={() => update(quantity - 1, true)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        min="1"
        inputMode="numeric"
        value={quantity}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => update(Number(event.target.value) || 1)}
        onBlur={() => onCommit?.(quantity)}
        className="h-10 min-w-0 flex-1 border-y border-input bg-background px-1 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-l-none"
        aria-label={`Increase ${label}`}
        disabled={disabled}
        onClick={() => update(quantity + 1, true)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function isConnectivityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    !navigator.onLine ||
    /fetch failed|failed to fetch|network|service is unavailable|connection/i.test(message)
  );
}

export function OrderManagementClient() {
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [queuedOrders, setQueuedOrders] = useState<QueuedAdminOrder[]>([]);
  const [expandedQueuedOrder, setExpandedQueuedOrder] = useState<string | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const [orderLimit, setOrderLimit] = useState(10);
  const [orderPagination, setOrderPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1
  });
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"cash" | "utang">("utang");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderLine[]>([{ productId: "", quantity: "1" }]);
  const [scanQuery, setScanQuery] = useState("");
  const [scanQuantity, setScanQuantity] = useState("1");
  const [error, setError] = useState("");
  const [scanError, setScanError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [queuedReviewOrder, setQueuedReviewOrder] = useState<QueuedAdminOrder | null>(null);
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewLine[]>([]);
  const [reviewItemPage, setReviewItemPage] = useState(1);
  const [reviewItemPagination, setReviewItemPagination] = useState({
    page: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 1
  });
  const [reviewOrderStatus, setReviewOrderStatus] = useState<Order["order_status"]>("pending");
  const [reviewPaymentStatus, setReviewPaymentStatus] = useState<Order["payment_status"]>("unpaid");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isReviewSaving, setIsReviewSaving] = useState(false);
  const [removingItemId, setRemovingItemId] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState("");
  const quantitySaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = quantitySaveTimers.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return sum + (product ? Number(product.price) * Number(item.quantity || 0) : 0);
    }, 0);
  }, [items, products]);
  const suggestedProducts = useMemo(() => {
    const normalizedQuery = scanQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return products
      .filter((product) =>
        [product.name, product.sku ?? "", product.barcode ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery))
      )
      .slice(0, 6);
  }, [products, scanQuery]);
  const suggestedCustomers = useMemo(() => {
    const normalizedQuery = customerQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return customers.slice(0, 8);
    }

    return customers
      .filter((customer) =>
        [customerName(customer), customer.email].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        )
      )
      .slice(0, 8);
  }, [customerQuery, customers]);
  const queuedUtangOrders = useMemo(
    () => queuedOrders.filter((queued) => queued.payload.paymentMode === "utang"),
    [queuedOrders]
  );
  const reviewTotal = useMemo(() => {
    return reviewItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  }, [reviewItems]);
  const isReviewLocked = reviewOrder?.order_status === "confirmed";
  const canEditReviewItems = reviewOrder?.payment_mode === "utang" && reviewOrder.order_status === "pending";

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const pageSnapshotKey = `admin-orders:${orderPage}:${orderLimit}`;

    try {
      const isStoreOnline = navigator.onLine && await checkStoreServiceConnection();

      if (!isStoreOnline) {
        throw new Error("The store service is unavailable.");
      }

      const data = await loadAdminOrderData(orderPage, orderLimit);
      const queuedOrders = await listQueuedAdminOrders();

      setQueuedOrders(queuedOrders);
      setCustomers(data.customers);
      setProducts(data.products);
      setOrders(mergeQueuedOrders(data.orders, queuedOrders, data.customers, data.products, orderPage));
      setOrderPagination({
        ...data.pagination,
        totalItems: data.pagination.totalItems + (orderPage === 1 ? queuedOrders.length : 0)
      });
      void saveAdminSnapshot<AdminOrderCatalogSnapshot>(adminOrderCatalogSnapshotKey, {
        customers: data.customers,
        products: data.products
      });
      void saveAdminSnapshot<AdminOrderPageSnapshot>(pageSnapshotKey, {
        orders: data.orders,
        pagination: data.pagination
      });
    } catch (loadError) {
      const [catalogSnapshot, pageSnapshot, legacySnapshot, queuedOrders] = await Promise.all([
        loadAdminSnapshot<AdminOrderCatalogSnapshot>(adminOrderCatalogSnapshotKey),
        loadAdminSnapshot<AdminOrderPageSnapshot>(pageSnapshotKey),
        loadAdminSnapshot<AdminOrderCatalogSnapshot & AdminOrderPageSnapshot>(pageSnapshotKey),
        listQueuedAdminOrders()
      ]);
      const catalog = catalogSnapshot ?? legacySnapshot;
      const savedPage = pageSnapshot ?? legacySnapshot;

      setQueuedOrders(queuedOrders);

      if (catalog || savedPage || queuedOrders.length) {
        const savedCustomers = catalog?.customers ?? [];
        const savedProducts = catalog?.products ?? [];
        const savedOrders = savedPage?.orders ?? [];
        const savedPagination = savedPage?.pagination ?? {
          page: orderPage,
          limit: orderLimit,
          totalItems: 0,
          totalPages: 1
        };

        setCustomers(savedCustomers);
        setProducts(savedProducts);
        setOrders(mergeQueuedOrders(savedOrders, queuedOrders, savedCustomers, savedProducts, orderPage));
        setOrderPagination({
          ...savedPagination,
          totalItems: savedPagination.totalItems + (orderPage === 1 ? queuedOrders.length : 0)
        });
        setSuccess("Showing saved offline order data.");
      } else {
        setError(loadError instanceof Error ? loadError.message : "Unable to load orders.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [orderLimit, orderPage]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const refreshQueue = () => {
      void listQueuedAdminOrders().then(setQueuedOrders);
    };
    const handleSync = () => void loadOrders();

    window.addEventListener(adminOfflineQueueEvent, refreshQueue);
    window.addEventListener(adminOfflineSyncEvent, handleSync);

    return () => {
      window.removeEventListener(adminOfflineQueueEvent, refreshQueue);
      window.removeEventListener(adminOfflineSyncEvent, handleSync);
    };
  }, [loadOrders]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    const clientReference = crypto.randomUUID();
    const normalizedItems = items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity)
      }));

    if (!customers.some((customer) => customer.email === customerEmail) || !normalizedItems.length) {
      setError("Choose a saved customer and add at least one valid product.");
      setIsSaving(false);
      return;
    }

    const payload = {
      clientReference,
      customerEmail,
      paymentMode,
      notes,
      items: normalizedItems
    };

    try {
      await queueAdminOrder(payload);
      let isStoreOnline = false;

      if (navigator.onLine) {
        try {
          isStoreOnline = await checkStoreServiceConnection();
        } catch {
          isStoreOnline = false;
        }
      }

      if (!isStoreOnline) {
        const queued = await listQueuedAdminOrders();

        setQueuedOrders(queued);
        setOrders((current) =>
          mergeQueuedOrders(
            current.filter((order) => order.id !== `offline:${clientReference}`),
            queued,
            customers,
            products,
            orderPage
          )
        );
        setOrderPagination((current) => ({
          ...current,
          totalItems: current.totalItems + (orderPage === 1 ? 1 : 0)
        }));
        setSuccess(
          paymentMode === "utang"
            ? "Utang saved offline. It will sync automatically when the connection returns."
            : "Cash order saved offline. It will sync automatically when the connection returns."
        );
        setItems([{ productId: "", quantity: "1" }]);
        setNotes("");
        return;
      }

      const data = await saveAdminOrder(payload);

      await removeQueuedAdminOrder(clientReference);
      setQueuedOrders(await listQueuedAdminOrders());
      setSuccess(`Order ${data.order.order_number} saved.`);
      setItems([{ productId: "", quantity: "1" }]);
      setNotes("");
      await loadOrders();
    } catch (saveError) {
      if (isConnectivityError(saveError)) {
        const queuedOrders = await listQueuedAdminOrders();

        setQueuedOrders(queuedOrders);
        setOrders((current) =>
          mergeQueuedOrders(
            current.filter((order) => order.id !== `offline:${clientReference}`),
            queuedOrders,
            customers,
            products,
            orderPage
          )
        );
        setOrderPagination((current) => ({
          ...current,
          totalItems: current.totalItems + (orderPage === 1 ? 1 : 0)
        }));
        setSuccess("Order saved offline. It will sync automatically when the store service reconnects.");
        setItems([{ productId: "", quantity: "1" }]);
        setNotes("");
      } else {
        await removeQueuedAdminOrder(clientReference);
        setError(saveError instanceof Error ? saveError.message : "Unable to save order.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function openOrderReview(order: Order, itemPage = 1) {
    setError("");
    setSuccess("");
    setIsReviewLoading(true);

    try {
      const data = await loadAdminOrderForReview(order.id, itemPage, 5);

      setReviewOrder(data.order);
      setReviewOrderStatus(data.order.order_status);
      setReviewPaymentStatus(data.order.payment_status);
      setReviewNotes(data.order.notes ?? "");
      setReviewItems(data.items.map(toReviewLine));
      setReviewItemPage(data.pagination.page);
      setReviewItemPagination(data.pagination);
      setQueuedReviewOrder(null);
      setIsOrderPanelOpen(true);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to load order.");
    } finally {
      setIsReviewLoading(false);
    }
  }

  function openQueuedOrderReview(queued: QueuedAdminOrder) {
    setError("");
    setSuccess("");
    setReviewOrder(null);
    setQueuedReviewOrder(queued);
    setIsOrderPanelOpen(true);
  }

  function openCreateOrder() {
    setError("");
    setSuccess("");
    setReviewOrder(null);
    setQueuedReviewOrder(null);
    setIsOrderPanelOpen(true);
  }

  function closeOrderPanel() {
    setReviewOrder(null);
    setQueuedReviewOrder(null);
    setIsOrderPanelOpen(false);
  }

  async function saveOrderReview() {
    if (!reviewOrder) {
      return;
    }

    setError("");
    setSuccess("");
    setIsReviewSaving(true);

    try {
      const data = await updateAdminOrderReview({
        orderId: reviewOrder.id,
        orderStatus: reviewOrderStatus as "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled",
        paymentStatus: reviewPaymentStatus as "unpaid" | "paid" | "refunded",
        notes: reviewNotes
      });

      setReviewOrder(data.order);
      setOrders((current) => current.map((order) => (order.id === data.order.id ? { ...order, ...data.order } : order)));
      setSuccess(`Order ${reviewOrder.order_number} updated.`);
      await loadOrders();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to update order.");
    } finally {
      setIsReviewSaving(false);
    }
  }

  async function removeReviewItem(itemId: string) {
    if (!reviewOrder) {
      return;
    }

    setError("");
    setSuccess("");
    setRemovingItemId(itemId);

    try {
      const removed = await removeAdminOrderItemFromCustomer(reviewOrder.id, itemId);
      const data = await loadAdminOrderForReview(reviewOrder.id, reviewItemPage, 5);

      setReviewOrder(data.order);
      setReviewItems(data.items.map(toReviewLine));
      setReviewItemPagination(data.pagination);
      setOrders((current) => current.map((order) => (order.id === removed.order.id ? { ...order, ...removed.order } : order)));
      setSuccess("Item removed from the pending utang order.");
      await loadOrders();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove item.");
    } finally {
      setRemovingItemId("");
    }
  }

  async function updateReviewItemQuantity(itemId: string, quantity: number) {
    if (!reviewOrder) {
      return;
    }

    if (quantity <= 0) {
      setError("Quantity must be at least 1.");
      return;
    }

    setError("");
    setSuccess("");
    setUpdatingItemId(itemId);

    try {
      await updateAdminOrderItemQuantity(reviewOrder.id, itemId, quantity);
      const data = await loadAdminOrderForReview(reviewOrder.id, reviewItemPage, 5);

      setReviewOrder(data.order);
      setReviewItems(data.items.map(toReviewLine));
      setReviewItemPagination(data.pagination);
      setSuccess("Item quantity updated.");
      await loadOrders();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update quantity.");
    } finally {
      setUpdatingItemId("");
    }
  }

  function scheduleReviewItemQuantityUpdate(itemId: string, quantity: number) {
    const existingTimer = quantitySaveTimers.current.get(itemId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    quantitySaveTimers.current.set(
      itemId,
      setTimeout(() => {
        quantitySaveTimers.current.delete(itemId);
        void updateReviewItemQuantity(itemId, quantity);
      }, 400)
    );
  }

  function commitReviewItemQuantity(itemId: string, quantity: number) {
    const existingTimer = quantitySaveTimers.current.get(itemId);

    if (!existingTimer) {
      return;
    }

    clearTimeout(existingTimer);
    quantitySaveTimers.current.delete(itemId);
    void updateReviewItemQuantity(itemId, quantity);
  }

  function addProductToOrder(productId: string, quantity = 1) {
    if (!productId) {
      return;
    }

    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.productId === productId);

      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex ? { ...item, quantity: String(Number(item.quantity || 0) + quantity) } : item
        );
      }

      const emptyIndex = current.findIndex((item) => !item.productId);

      if (emptyIndex >= 0) {
        return current.map((item, index) => (index === emptyIndex ? { productId, quantity: String(quantity) } : item));
      }

      return [...current, { productId, quantity: String(quantity) }];
    });
  }

  function addScannedProduct() {
    const normalizedQuery = scanQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      setScanError("Scan or enter an item barcode, SKU, or name.");
      return;
    }

    const product = products.find((entry) =>
      [entry.barcode ?? "", entry.sku ?? "", entry.name].some((value) => value.trim().toLowerCase() === normalizedQuery)
    ) ?? products.find((entry) => entry.name.toLowerCase().includes(normalizedQuery));

    if (!product) {
      setScanError("Item not found. Check the barcode, SKU, or product name.");
      return;
    }

    addSuggestedProduct(product.id);
  }

  function addSuggestedProduct(productId: string) {
    const quantity = Math.max(1, Number(scanQuantity) || 1);

    addProductToOrder(productId, quantity);
    setScanQuery("");
    setScanQuantity("1");
    setScanError("");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
      <div className="order-1 xl:hidden">
        <Button type="button" className="w-full" onClick={openCreateOrder}>
          <Plus className="h-4 w-4" />
          Add Order
        </Button>
      </div>
      <Card className="order-2 min-w-0 xl:order-1">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Cash and utang orders recorded by the store.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 border-b pb-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CloudOff className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Utang Waiting to Sync</h2>
              </div>
              <span className="text-xs text-muted-foreground">{queuedUtangOrders.length} pending</span>
            </div>
            {queuedUtangOrders.length ? (
              <div className="grid gap-2">
                {queuedUtangOrders.map((queued) => {
                  const row = queuedOrderRow(queued, customers, products);
                  const isExpanded = expandedQueuedOrder === queued.clientReference;
                  const queuedItems = queuedOrderItems(queued, products);

                  return (
                    <div
                      key={queued.clientReference}
                      className="overflow-hidden rounded-md border bg-muted/20 text-sm"
                    >
                      <button
                        type="button"
                        className="grid w-full gap-2 px-3 py-3 text-left hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedQueuedOrder((current) =>
                            current === queued.clientReference ? null : queued.clientReference
                          )
                        }
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{row.customer_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {queued.payload.items.length} item{queued.payload.items.length === 1 ? "" : "s"} waiting to sync
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                          <div className="font-semibold">{money(row.total)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(queued.createdAt).toLocaleString("en-PH")}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {isExpanded ? (
                        <div className="border-t bg-background px-3 py-3">
                          <div className="grid gap-2">
                            {queuedItems.map((item, index) => (
                              <div
                                key={`${queued.clientReference}-${item.productId}-${index}`}
                                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b pb-2 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_70px_100px_100px]"
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{item.name}</div>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {item.sku || "No SKU"}
                                  </div>
                                </div>
                                <div className="text-right sm:text-left">
                                  <span className="text-xs text-muted-foreground sm:hidden">Qty </span>
                                  {item.quantity}
                                </div>
                                <div className="hidden text-right text-muted-foreground sm:block">
                                  {money(item.unitPrice)}
                                </div>
                                <div className="text-right font-medium">{money(item.lineTotal)}</div>
                              </div>
                            ))}
                          </div>
                          {row.notes ? (
                            <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Notes:</span> {row.notes}
                            </div>
                          ) : null}
                          {queued.lastError ? (
                            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                              {queued.lastError}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No offline utang waiting to sync.</p>
            )}
          </div>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading orders...</p> : null}
          {error ? <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
          <div className="grid gap-3">
            {orders.map((order) => (
              <div key={order.id} className="grid gap-3 rounded-md border p-4 sm:grid-cols-[150px_1fr_100px_120px_90px] sm:items-center">
                <span className="text-sm font-medium">{order.order_number}</span>
                <span className="text-sm text-muted-foreground">{order.customer_name}</span>
                <span className="text-sm capitalize">{order.order_status}</span>
                <span className="text-sm font-semibold sm:text-right">{money(order.total)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (order.id.startsWith("offline:")) {
                      const queued = queuedOrders.find(
                        (entry) => `offline:${entry.clientReference}` === order.id
                      );

                      if (queued) {
                        openQueuedOrderReview(queued);
                      }
                      return;
                    }

                    void openOrderReview(order);
                  }}
                  disabled={isReviewLoading}
                >
                  Review
                </Button>
              </div>
            ))}
            {!isLoading && !orders.length ? <p className="text-sm text-muted-foreground">No orders recorded yet.</p> : null}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {orderPagination.totalItems} orders
            </span>
            <div className="flex items-center gap-2">
              <select
                value={orderLimit}
                onChange={(event) => {
                  setOrderLimit(Number(event.target.value));
                  setOrderPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Orders per page"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous orders page"
                disabled={orderPage <= 1 || isLoading}
                onClick={() => setOrderPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-20 text-center text-sm">
                {orderPagination.page} / {orderPagination.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next orders page"
                disabled={orderPage >= orderPagination.totalPages || isLoading}
                onClick={() => setOrderPage((current) => Math.min(orderPagination.totalPages, current + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOrderPanelOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[100] bg-black/60 xl:hidden"
          aria-label="Close order panel"
          onClick={closeOrderPanel}
        />
      ) : null}

      <Card
        role={isOrderPanelOpen ? "dialog" : undefined}
        aria-modal={isOrderPanelOpen ? true : undefined}
        className={`order-1 min-w-0 xl:order-2 ${
          isOrderPanelOpen
            ? "fixed inset-x-3 bottom-3 top-20 z-[101] flex h-auto max-h-[calc(100dvh-5.75rem)] flex-col overflow-hidden"
            : "hidden"
        } xl:static xl:flex xl:h-fit xl:max-h-none xl:flex-col xl:overflow-visible`}
      >
        <CardHeader className="shrink-0 flex-row items-start justify-between space-y-0">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="break-words">
              {queuedReviewOrder
                ? `Review Offline ${queuedReviewOrder.clientReference.slice(0, 8)}`
                : reviewOrder
                  ? `Review ${reviewOrder.order_number}`
                  : "Create Order"}
            </CardTitle>
            <CardDescription>
              {queuedReviewOrder
                ? "This order is saved on this device and waiting to sync."
                : reviewOrder
                  ? "Confirm stock, adjust pending quantities, and update what the customer sees."
                  : "Assign items to a Customer user and choose cash or utang."}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 xl:hidden"
            aria-label="Close order panel"
            onClick={closeOrderPanel}
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain xl:overflow-visible">
          {!queuedReviewOrder && success ? <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{success}</div> : null}
          {queuedReviewOrder ? (
            <div className="grid gap-4">
              <div className="rounded-md border bg-muted/20 p-3 text-sm">
                <div className="font-medium">
                  {queuedOrderRow(queuedReviewOrder, customers, products).customer_name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Saved {new Date(queuedReviewOrder.createdAt).toLocaleString("en-PH")}
                </div>
              </div>

              <div className="grid gap-2">
                {queuedOrderItems(queuedReviewOrder, products).map((item, index) => (
                  <div
                    key={`${queuedReviewOrder.clientReference}-${item.productId}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{item.sku || "No SKU"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.quantity} x {money(item.unitPrice)}
                      </div>
                    </div>
                    <span className="font-semibold">{money(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              {queuedReviewOrder.payload.notes?.trim() ? (
                <div className="rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">Notes:</span> {queuedReviewOrder.payload.notes}
                </div>
              ) : null}
              {queuedReviewOrder.lastError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {queuedReviewOrder.lastError}
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span>Total</span>
                <span className="font-semibold">
                  {money(queuedOrderRow(queuedReviewOrder, customers, products).total)}
                </span>
              </div>
              <Button type="button" variant="outline" onClick={closeOrderPanel}>
                Close
              </Button>
            </div>
          ) : reviewOrder ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Order Status
                  <select
                    value={reviewOrderStatus}
                    onChange={(event) => setReviewOrderStatus(event.target.value)}
                    disabled={isReviewLocked}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {["pending", "confirmed", "preparing", "ready", "completed", "cancelled"].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Payment Status
                  <select
                    value={reviewPaymentStatus}
                    onChange={(event) => setReviewPaymentStatus(event.target.value)}
                    disabled={isReviewLocked}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {["unpaid", "paid", "refunded"].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Notes
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add collector, pickup, or other order details"
                />
              </label>

              <div className="grid gap-2">
                {reviewItems.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.productName}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.productSku || "No SKU"}</div>
                    </div>
                    <div className="grid grid-cols-[112px_minmax(0,1fr)_40px] items-center gap-2 sm:grid-cols-[112px_1fr_96px_40px]">
                    {canEditReviewItems ? (
                      <QuantityStepper
                        value={item.quantity}
                        onChange={(quantity) => {
                          setReviewItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    quantity,
                                    lineTotal: Number(entry.unitPrice) * quantity
                              }
                                : entry
                            )
                          );
                          scheduleReviewItemQuantityUpdate(item.id, quantity);
                        }}
                        onCommit={(quantity) => commitReviewItemQuantity(item.id, quantity)}
                        disabled={updatingItemId === item.id}
                        label={`quantity for ${item.productName}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    )}
                    <span className="hidden text-muted-foreground sm:block">{money(item.unitPrice)}</span>
                    <span className="font-semibold sm:text-right">{money(item.lineTotal)}</span>
                    {canEditReviewItems ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Remove ${item.productName}`}
                        title="Remove item"
                        onClick={() => removeReviewItem(item.id)}
                        disabled={removingItemId === item.id || updatingItemId === item.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span />
                    )}
                    </div>
                  </div>
                ))}
              </div>
              {reviewItemPagination.totalPages > 1 ? (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous order items page"
                    disabled={reviewItemPage <= 1 || isReviewLoading}
                    onClick={() => openOrderReview(reviewOrder, Math.max(1, reviewItemPage - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-20 text-center text-sm">
                    {reviewItemPagination.page} / {reviewItemPagination.totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next order items page"
                    disabled={reviewItemPage >= reviewItemPagination.totalPages || isReviewLoading}
                    onClick={() => openOrderReview(reviewOrder, Math.min(reviewItemPagination.totalPages, reviewItemPage + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span>Order Total</span>
                <span className="font-semibold">{money(reviewTotal)}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" onClick={saveOrderReview} disabled={isReviewSaving}>
                  {isReviewSaving ? "Saving..." : isReviewLocked ? "Save Notes" : "Update Order"}
                </Button>
                <Button type="button" variant="outline" onClick={closeOrderPanel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2 text-sm font-medium">
              <label htmlFor="order-customer-search">Customer</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="order-customer-search"
                  value={customerQuery}
                  onFocus={() => setIsCustomerSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setIsCustomerSearchOpen(false), 100)}
                  onChange={(event) => {
                    setCustomerQuery(event.target.value);
                    setCustomerEmail("");
                    setIsCustomerSearchOpen(true);
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-9 text-sm"
                  placeholder="Search customer name or email"
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={isCustomerSearchOpen}
                  aria-controls="order-customer-results"
                />
                {customerQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerQuery("");
                      setCustomerEmail("");
                      setIsCustomerSearchOpen(true);
                    }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear customer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                {isCustomerSearchOpen ? (
                  <div
                    id="order-customer-results"
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-background p-1 shadow-lg"
                  >
                    {suggestedCustomers.length ? (
                      suggestedCustomers.map((customer) => (
                        <button
                          key={customer.email}
                          type="button"
                          role="option"
                          aria-selected={customer.email === customerEmail}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setCustomerEmail(customer.email);
                            setCustomerQuery(customerName(customer));
                            setIsCustomerSearchOpen(false);
                          }}
                          className="block w-full rounded-md px-3 py-2 text-left hover:bg-accent"
                        >
                          <span className="block font-medium">{customerName(customer)}</span>
                          <span className="block text-xs font-normal text-muted-foreground">{customer.email}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 font-normal text-muted-foreground">No customers found.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-md border bg-muted/20 p-3">
                <label className="grid gap-2 text-sm font-medium">
                  Scan or Search Item
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                    <input
                      value={scanQuery}
                      onChange={(event) => setScanQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addScannedProduct();
                        }
                      }}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      placeholder="Barcode, SKU, or product name"
                      autoComplete="off"
                    />
                    <QuantityStepper
                      value={scanQuantity}
                      onChange={(quantity) => setScanQuantity(String(quantity))}
                      label="scan quantity"
                    />
                    <Button type="button" onClick={addScannedProduct}>
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </label>
                {scanQuery.trim() ? (
                  <div className="mt-2 overflow-hidden rounded-md border bg-background">
                    {suggestedProducts.length ? (
                      suggestedProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addSuggestedProduct(product.id)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span>
                            <span className="font-medium">{product.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{product.sku || product.barcode || "No code"}</span>
                          </span>
                          <span className="shrink-0 font-medium">{money(product.price)}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No matching items found.</div>
                    )}
                  </div>
                ) : null}
                {scanError ? <p className="mt-2 text-xs text-destructive">{scanError}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">Scanner-ready: focus this field, scan an item, and it will add on Enter.</p>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_40px]">
                  <select
                    value={item.productId}
                    onChange={(event) =>
                      setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, productId: event.target.value } : entry))
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {money(product.price)}
                      </option>
                    ))}
                  </select>
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(quantity) =>
                      setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: String(quantity) } : entry))
                    }
                    label={`quantity for item ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove item"
                    onClick={() => setItems((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, { productId: "", quantity: "1" }])}>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Payment Mode
              <select
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value as "cash" | "utang")}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="utang">Utang</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Order notes"
              />
            </label>
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span>Total</span>
              <span className="font-semibold">{money(total)}</span>
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : paymentMode === "utang" ? "Save as Utang" : "Save Cash Order"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
