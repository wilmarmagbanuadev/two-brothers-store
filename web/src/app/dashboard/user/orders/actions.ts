"use server";

import {
  currentCustomer,
  customerDirectusRequest,
  customerSessionFromCookies
} from "@/lib/customer-directus";

type DirectusListResponse<T> = {
  data: T[];
  meta?: {
    filter_count?: number;
  };
};

export type CustomerOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  payment_mode: "cash" | "utang";
  payment_status: string;
  order_status: string;
  total: string | number;
  date_created: string;
};

export type CustomerOrderItem = {
  id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: string | number;
  line_total: string | number;
};

export type CustomerPayment = {
  id: string;
  amount: string | number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  received_by: string | null;
};

type PaymentAllocation = {
  order_id: string;
  amount: string | number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pagination(page: number, limit: number, totalItems: number) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit))
  };
}

export async function loadCustomerOrdersPage(options?: {
  page?: number;
  limit?: number;
  paymentMode?: "utang" | "cash";
}) {
  const session = await customerSessionFromCookies();
  const user = await currentCustomer(session);
  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.min(50, Math.max(5, Number(options?.limit) || 10));
  const params = new URLSearchParams({
    fields: "id,order_number,customer_name,payment_mode,payment_status,order_status,total,date_created",
    "filter[customer_id][_eq]": user.id,
    sort: "-date_created",
    meta: "filter_count",
    page: String(page),
    limit: String(limit)
  });

  if (options?.paymentMode) {
    params.set("filter[payment_mode][_eq]", options.paymentMode);
  }

  const orders = await customerDirectusRequest<DirectusListResponse<CustomerOrder>>(
    session,
    `/items/customer_orders?${params.toString()}`
  );
  const totalItems = Number(orders.meta?.filter_count ?? orders.data.length);

  return {
    orders: orders.data,
    pagination: pagination(page, limit, totalItems)
  };
}

export async function loadCustomerOrderDetail(orderId: string, itemPage = 1, itemLimit = 10) {
  const session = await customerSessionFromCookies();
  const user = await currentCustomer(session);
  const safeItemPage = Math.max(1, Number(itemPage) || 1);
  const safeItemLimit = Math.min(50, Math.max(5, Number(itemLimit) || 10));
  const orders = await customerDirectusRequest<DirectusListResponse<CustomerOrder>>(
    session,
    `/items/customer_orders?fields=id,order_number,customer_name,payment_mode,payment_status,order_status,total,date_created&filter[id][_eq]=${encodeURIComponent(orderId)}&filter[customer_id][_eq]=${encodeURIComponent(user.id)}&limit=1`
  );
  const order = orders.data[0];

  if (!order) {
    throw new Error("Order not found.");
  }

  const items = await customerDirectusRequest<DirectusListResponse<CustomerOrderItem>>(
    session,
    `/items/order_items?fields=id,product_name,product_sku,quantity,unit_price,line_total&filter[order_id][_eq]=${encodeURIComponent(orderId)}&meta=filter_count&sort=date_created&page=${safeItemPage}&limit=${safeItemLimit}`
  );
  const totalItems = Number(items.meta?.filter_count ?? items.data.length);

  return {
    order,
    items: items.data,
    pagination: pagination(safeItemPage, safeItemLimit, totalItems)
  };
}

async function customerBalance(session: Awaited<ReturnType<typeof customerSessionFromCookies>>, userId: string) {
  const orders = await customerDirectusRequest<DirectusListResponse<CustomerOrder>>(
    session,
    `/items/customer_orders?fields=id,order_number,customer_name,payment_mode,payment_status,order_status,total,date_created&filter[customer_id][_eq]=${encodeURIComponent(userId)}&filter[payment_mode][_eq]=utang&filter[order_status][_eq]=confirmed&sort=date_created&limit=1000`
  );
  const allocations = await customerDirectusRequest<DirectusListResponse<PaymentAllocation>>(
    session,
    `/items/payment_allocations?fields=order_id,amount&filter[order_id][customer_id][_eq]=${encodeURIComponent(userId)}&filter[payment_id][status][_eq]=published&limit=5000`
  );
  const allocatedByOrder = new Map<string, number>();

  allocations.data.forEach((allocation) => {
    allocatedByOrder.set(
      allocation.order_id,
      roundMoney((allocatedByOrder.get(allocation.order_id) ?? 0) + Number(allocation.amount))
    );
  });

  const orderBalances = orders.data.map((order) => {
    const paid = roundMoney(Math.min(Number(order.total), allocatedByOrder.get(order.id) ?? 0));

    return {
      ...order,
      paid,
      balance: roundMoney(Math.max(0, Number(order.total) - paid))
    };
  });
  const totalUtang = roundMoney(orderBalances.reduce((sum, order) => sum + Number(order.total), 0));
  const totalPaid = roundMoney(orderBalances.reduce((sum, order) => sum + order.paid, 0));

  return {
    orders: orderBalances,
    totalUtang,
    totalPaid,
    balance: roundMoney(Math.max(0, totalUtang - totalPaid))
  };
}

export async function loadCustomerBalance() {
  const session = await customerSessionFromCookies();
  const user = await currentCustomer(session);

  return customerBalance(session, user.id);
}

export async function loadCustomerPaymentsPage(page = 1, limit = 10) {
  const session = await customerSessionFromCookies();
  const user = await currentCustomer(session);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(5, Number(limit) || 10));
  const [ledger, payments] = await Promise.all([
    customerBalance(session, user.id),
    customerDirectusRequest<DirectusListResponse<CustomerPayment>>(
      session,
      `/items/customer_payments?fields=id,amount,payment_date,payment_method,notes,received_by&filter[customer_id][_eq]=${encodeURIComponent(user.id)}&filter[status][_eq]=published&meta=filter_count&sort=-payment_date&page=${safePage}&limit=${safeLimit}`
    )
  ]);
  const totalItems = Number(payments.meta?.filter_count ?? payments.data.length);

  return {
    balance: ledger.balance,
    payments: payments.data,
    pagination: pagination(safePage, safeLimit, totalItems)
  };
}

export async function loadCustomerTransactionsPage(page = 1, limit = 10) {
  const session = await customerSessionFromCookies();
  const user = await currentCustomer(session);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(5, Number(limit) || 10));
  const fetchLimit = safePage * safeLimit;
  const [ledger, orders, payments] = await Promise.all([
    customerBalance(session, user.id),
    customerDirectusRequest<DirectusListResponse<CustomerOrder>>(
      session,
      `/items/customer_orders?fields=id,order_number,total,date_created&filter[customer_id][_eq]=${encodeURIComponent(user.id)}&filter[payment_mode][_eq]=utang&filter[order_status][_eq]=confirmed&meta=filter_count&sort=-date_created&page=1&limit=${fetchLimit}`
    ),
    customerDirectusRequest<DirectusListResponse<CustomerPayment>>(
      session,
      `/items/customer_payments?fields=id,amount,payment_date,payment_method,notes,received_by&filter[customer_id][_eq]=${encodeURIComponent(user.id)}&filter[status][_eq]=published&meta=filter_count&sort=-payment_date&page=1&limit=${fetchLimit}`
    )
  ]);
  const activity = [
    ...orders.data.map((order) => ({
      id: `order-${order.id}`,
      recordId: order.id,
      type: "order" as const,
      date: order.date_created,
      title: order.order_number,
      detail: "Confirmed utang order",
      charge: Number(order.total),
      payment: 0
    })),
    ...payments.data.map((payment) => ({
      id: `payment-${payment.id}`,
      recordId: payment.id,
      type: "payment" as const,
      date: payment.payment_date,
      title: "Payment",
      detail: [
        (payment.payment_method || "cash").replace("_", " "),
        payment.received_by ? `received by ${payment.received_by}` : "",
        payment.notes || ""
      ].filter(Boolean).join(" - "),
      charge: 0,
      payment: Number(payment.amount)
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let runningBalance = ledger.balance;
  const activityWithBalance = activity.map((entry) => {
    const result = { ...entry, balance: runningBalance };
    runningBalance = roundMoney(runningBalance - entry.charge + entry.payment);
    return result;
  });
  const totalItems = Number(orders.meta?.filter_count ?? orders.data.length)
    + Number(payments.meta?.filter_count ?? payments.data.length);
  const offset = (safePage - 1) * safeLimit;

  return {
    transactions: activityWithBalance.slice(offset, offset + safeLimit),
    pagination: pagination(safePage, safeLimit, totalItems)
  };
}
