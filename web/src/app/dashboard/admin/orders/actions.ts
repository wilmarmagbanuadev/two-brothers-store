"use server";

import { cookies } from "next/headers";

import {
  adminAccessCookie,
  adminRefreshCookie,
  cookieOptions,
  decryptSessionValue,
  encryptSessionValue
} from "@/lib/admin-session";
import { DirectusRefreshError, refreshDirectusSession } from "@/lib/directus-refresh";
import { roleNameFromAccessToken } from "@/lib/directus-role";

const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const directusToken = process.env.DIRECTUS_STATIC_TOKEN;

type AdminSession = {
  accessToken: string;
  refreshToken?: string;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expires: number;
  };
};

type DirectusListResponse<T> = {
  data: T[];
  meta?: {
    filter_count?: number;
  };
};

type DirectusItemResponse<T> = {
  data: T;
};

type DirectusUser = {
  id: string;
  email: string | null;
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
  customer_id: string | null;
  customer_name: string;
  payment_mode: "cash" | "utang";
  payment_status: string;
  order_status: string;
  total: string | number;
  notes: string | null;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: string | number;
  line_total: string | number;
  status: "active" | "removed";
};

export type AdminOrderPayload = {
  customerEmail: string;
  paymentMode: "cash" | "utang";
  notes?: string;
  clientReference?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type AdminOrderReviewPayload = {
  orderId: string;
  orderStatus: "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  notes?: string;
};

function displayName(user: DirectusUser) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email || "Customer";
}

async function sessionFromCookies(): Promise<AdminSession> {
  const cookieStore = await cookies();
  const encryptedAccessToken = cookieStore.get(adminAccessCookie)?.value;
  const encryptedRefreshToken = cookieStore.get(adminRefreshCookie)?.value;
  const refreshToken = encryptedRefreshToken ? decryptSessionValue(encryptedRefreshToken) : undefined;

  if (encryptedAccessToken) {
    return {
      accessToken: decryptSessionValue(encryptedAccessToken),
      refreshToken
    };
  }

  if (refreshToken) {
    return {
      accessToken: "",
      refreshToken
    };
  }

  if (directusToken) {
    return {
      accessToken: directusToken
    };
  }

  throw new Error("Please log in as an admin to manage orders.");
}

async function saveRefreshedSession(session: AdminSession) {
  if (!session.refreshed) {
    return;
  }

  const cookieStore = await cookies();
  const maxAgeSeconds = Math.max(60, Math.floor(session.refreshed.expires / 1000));

  cookieStore.set(adminAccessCookie, encryptSessionValue(session.refreshed.accessToken), cookieOptions(maxAgeSeconds));
  cookieStore.set(adminRefreshCookie, encryptSessionValue(session.refreshed.refreshToken), cookieOptions(60 * 60 * 24 * 30));
}

async function refreshSession(session: AdminSession) {
  if (!session.refreshToken) {
    throw new Error("Your admin session has expired. Please log in again.");
  }

  let refreshed;

  try {
    refreshed = await refreshDirectusSession(session.refreshToken);
  } catch (error) {
    if (error instanceof DirectusRefreshError && error.reason === "unavailable") {
      throw new Error("The store service is unavailable. This order can be saved offline.");
    }

    throw new Error("Your admin session has expired. Please log in again.");
  }

  session.accessToken = refreshed.accessToken;
  session.refreshToken = refreshed.refreshToken;
  session.refreshed = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expires: refreshed.expires
  };

  await saveRefreshedSession(session);
}

async function assertAdminSession(session: AdminSession) {
  if (!session.accessToken && session.refreshToken) {
    await refreshSession(session);
  }

  let roleName = await roleNameFromAccessToken(session.accessToken);

  if (!roleName && session.refreshToken) {
    await refreshSession(session);
    roleName = await roleNameFromAccessToken(session.accessToken);
  }

  if (roleName !== "Admin") {
    throw new Error("Please use an admin account to manage orders.");
  }
}

async function directusActionRequest<T>(path: string, init?: RequestInit, session?: AdminSession) {
  const activeSession = session ?? await sessionFromCookies();

  if (!activeSession.accessToken && activeSession.refreshToken) {
    await refreshSession(activeSession);
  }

  const runRequest = () =>
    fetch(`${directusUrl.replace(/\/$/, "")}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        Authorization: `Bearer ${activeSession.accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers
      }
    });

  let response: Response;

  try {
    response = await runRequest();
  } catch {
    throw new Error("The store service is unavailable. This order can be saved offline.");
  }

  if (response.status === 401 && activeSession.refreshToken) {
    await refreshSession(activeSession);

    try {
      response = await runRequest();
    } catch {
      throw new Error("The store service is unavailable. This order can be saved offline.");
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your admin session has expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("Your admin account does not have permission to manage orders.");
    }

    throw new Error("Something went wrong while saving order data. Please try again.");
  }

  await saveRefreshedSession(activeSession);

  if (response.status === 204) {
    return {
      data: null as T,
      session: activeSession
    };
  }

  return {
    data: await response.json() as T,
    session: activeSession
  };
}


async function customerRoleId(session: AdminSession) {
  const customerRole = await directusActionRequest<DirectusListResponse<{ id: string; name: string }>>(
    "/roles?fields=id,name&filter[name][_eq]=Customer&limit=1",
    undefined,
    session
  );

  return {
    id: customerRole.data.data[0]?.id,
    session: customerRole.session
  };
}

async function loadAllDirectusItems<T>(path: string, session: AdminSession) {
  const items: T[] = [];
  let activeSession = session;
  let page = 1;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await directusActionRequest<DirectusListResponse<T>>(
      `${path}${separator}meta=filter_count&page=${page}&limit=100`,
      undefined,
      activeSession
    );
    const pageItems = response.data.data;

    items.push(...pageItems);
    activeSession = response.session;

    const totalItems = Number(response.data.meta?.filter_count ?? 0);

    if (!pageItems.length || pageItems.length < 100 || (totalItems > 0 && items.length >= totalItems)) {
      break;
    }

    page += 1;
  }

  return {
    items,
    session: activeSession
  };
}

async function loadAdminOrderCatalogForSession(session: AdminSession) {
  const customerRole = await customerRoleId(session);
  const customers = customerRole.id
    ? await loadAllDirectusItems<DirectusUser>(
        `/users?fields=id,email,first_name,last_name,role&filter[role][_eq]=${encodeURIComponent(customerRole.id)}&sort=first_name`,
        customerRole.session
      )
    : { items: [] as DirectusUser[], session: customerRole.session };
  const products = await loadAllDirectusItems<Product>(
    "/items/products?fields=id,name,sku,barcode,price&filter[status][_eq]=active&sort=name",
    customers.session
  );

  return {
    customers: customers.items
      .filter((customer): customer is DirectusUser & { email: string } => Boolean(customer.email))
      .map((customer) => ({
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name
      })),
    products: products.items,
    session: products.session
  };
}

export async function loadAdminOrderCatalog() {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  const catalog = await loadAdminOrderCatalogForSession(session);

  return {
    customers: catalog.customers,
    products: catalog.products
  };
}

export async function loadAdminOrderData(page = 1, limit = 10) {
  const session = await sessionFromCookies();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(5, Number(limit) || 10));

  await assertAdminSession(session);

  const catalog = await loadAdminOrderCatalogForSession(session);
  const orders = await directusActionRequest<DirectusListResponse<Order>>(
    `/items/customer_orders?fields=id,customer_id,order_number,customer_name,payment_mode,payment_status,order_status,total,date_created&meta=filter_count&sort=-date_created&page=${safePage}&limit=${safeLimit}`,
    undefined,
    catalog.session
  );

  return {
    customers: catalog.customers,
    products: catalog.products,
    orders: orders.data.data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems: Number(orders.data.meta?.filter_count ?? orders.data.data.length),
      totalPages: Math.max(
        1,
        Math.ceil(Number(orders.data.meta?.filter_count ?? orders.data.data.length) / safeLimit)
      )
    }
  };
}

export async function saveAdminOrder(payload: AdminOrderPayload) {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  const clientReference = payload.clientReference?.trim() || null;

  if (clientReference && !/^[a-zA-Z0-9-]{8,100}$/.test(clientReference)) {
    throw new Error("The offline order reference is invalid.");
  }

  if (clientReference) {
    const existing = await directusActionRequest<DirectusListResponse<Order>>(
      `/items/customer_orders?fields=id,customer_id,order_number,customer_name,payment_mode,payment_status,order_status,total,notes&filter[client_reference][_eq]=${encodeURIComponent(clientReference)}&limit=1`,
      undefined,
      session
    );

    if (existing.data.data[0]) {
      return {
        order: existing.data.data[0]
      };
    }
  }

  const items = payload.items.filter((item) => item.productId && Number(item.quantity) > 0);

  if (!payload.customerEmail || !items.length) {
    throw new Error("Please choose a customer and add at least one item.");
  }

  const customerRole = await customerRoleId(session);

  if (!customerRole.id) {
    throw new Error("Customer role was not found in Directus.");
  }

  const customerParams = new URLSearchParams({
    fields: "id,email,first_name,last_name",
    "filter[email][_eq]": payload.customerEmail,
    "filter[role][_eq]": customerRole.id,
    limit: "1"
  });
  const customer = await directusActionRequest<DirectusListResponse<DirectusUser>>(
    `/users?${customerParams.toString()}`,
    undefined,
    customerRole.session
  );
  const user = customer.data.data[0];

  if (!user) {
    throw new Error("Please choose a valid customer account.");
  }

  const productParams = new URLSearchParams({
    fields: "id,name,sku,barcode,price"
  });

  items.forEach((item, index) => {
    productParams.set(`filter[id][_in][${index}]`, item.productId);
  });

  const products = await directusActionRequest<DirectusListResponse<Product>>(
    `/items/products?${productParams.toString()}`,
    undefined,
    customer.session
  );
  const productsById = new Map(products.data.data.map((product) => [product.id, product]));
  if (productsById.size !== items.length) {
    throw new Error("Some selected products are no longer available.");
  }
  const subtotal = items.reduce((total, item) => {
    const product = productsById.get(item.productId);

    return total + (product ? Number(product.price) * Number(item.quantity) : 0);
  }, 0);
  const order = await directusActionRequest<DirectusItemResponse<Order>>(
    "/items/customer_orders",
    {
      method: "POST",
      body: JSON.stringify({
        customer_id: user.id,
        customer_name: displayName(user),
        customer_email: user.email,
        fulfillment_method: "pickup",
        order_status: "confirmed",
        payment_status: payload.paymentMode === "utang" ? "unpaid" : "paid",
        payment_mode: payload.paymentMode,
        subtotal,
        delivery_fee: 0,
        total: subtotal,
        client_reference: clientReference,
        notes: payload.notes?.trim() || null
      })
    },
    products.session
  );

  await Promise.all(
    items.map((item) => {
      const product = productsById.get(item.productId)!;

      return directusActionRequest(
        "/items/order_items",
        {
          method: "POST",
          body: JSON.stringify({
            order_id: order.data.data.id,
            product_id: product.id,
            product_name: product.name,
          product_sku: product.sku,
          quantity: Number(item.quantity),
          unit_price: Number(product.price),
          status: "active"
        })
        },
        order.session
      );
    })
  );

  return {
    order: order.data.data
  };
}

export async function loadAdminOrderForReview(orderId: string, itemPage = 1, itemLimit = 5) {
  const session = await sessionFromCookies();
  const safePage = Math.max(1, Number(itemPage) || 1);
  const safeLimit = Math.min(50, Math.max(5, Number(itemLimit) || 5));

  await assertAdminSession(session);

  const order = await directusActionRequest<DirectusItemResponse<Order>>(
    `/items/customer_orders/${encodeURIComponent(orderId)}?fields=id,customer_id,order_number,customer_name,payment_mode,payment_status,order_status,total,notes`,
    undefined,
    session
  );
  
  const items = await directusActionRequest<DirectusListResponse<OrderItem>>(
    `/items/order_items?fields=id,product_id,product_name,product_sku,quantity,unit_price,line_total&filter[order_id][_eq]=${encodeURIComponent(orderId)}&meta=filter_count&sort=date_created&page=${safePage}&limit=${safeLimit}`,
    undefined,
    order.session
  );
  return {
    order: order.data.data,
    items: items.data.data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems: Number(items.data.meta?.filter_count ?? items.data.data.length),
      totalPages: Math.max(
        1,
        Math.ceil(Number(items.data.meta?.filter_count ?? items.data.data.length) / safeLimit)
      )
    }
  };
}

export async function updateAdminOrderReview(payload: AdminOrderReviewPayload) {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  if (!payload.orderId) {
    throw new Error("Please choose an order to update.");
  }

  const currentOrder = await directusActionRequest<DirectusItemResponse<Order>>(
    `/items/customer_orders/${encodeURIComponent(payload.orderId)}?fields=id,order_status,payment_status`,
    undefined,
    session
  );

  if (
    currentOrder.data.data.order_status === "confirmed" &&
    (payload.orderStatus !== currentOrder.data.data.order_status ||
      payload.paymentStatus !== currentOrder.data.data.payment_status)
  ) {
    throw new Error("The status and payment status of a confirmed order cannot be changed.");
  }

  const updatePayload = currentOrder.data.data.order_status === "confirmed"
    ? {
        notes: payload.notes?.trim() || null
      }
    : {
        order_status: payload.orderStatus,
        payment_status: payload.paymentStatus,
        notes: payload.notes?.trim() || null
      };

  const order = await directusActionRequest<DirectusItemResponse<Order>>(
    `/items/customer_orders/${encodeURIComponent(payload.orderId)}?fields=id,customer_id,order_number,customer_name,payment_mode,payment_status,order_status,total,notes`,
    {
      method: "PATCH",
      body: JSON.stringify(updatePayload)
    },
    currentOrder.session
  );

  return {
    order: order.data.data
  };
}

async function recalculateCustomerOrderTotal(orderId: string, session: AdminSession) {
  const remainingItems = await directusActionRequest<
    DirectusListResponse<{ quantity: number; unit_price: string | number }>
  >(
    `/items/order_items?fields=quantity,unit_price&filter[order_id][_eq]=${encodeURIComponent(orderId)}&limit=100`,
    undefined,
    session
  );
  const subtotal = remainingItems.data.data.reduce(
    (total, item) => total + Number(item.quantity) * Number(item.unit_price),
    0
  );
  const updatedOrder = await directusActionRequest<DirectusItemResponse<Order>>(
    `/items/customer_orders/${encodeURIComponent(orderId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        subtotal,
        total: subtotal
      })
    },
    remainingItems.session
  );

  return updatedOrder.data.data;
}

export async function updateAdminOrderItemQuantity(orderId: string, itemId: string, quantity: number) {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  if (!orderId || !itemId || Number(quantity) <= 0) {
    throw new Error("Please enter a valid quantity.");
  }

  const order = await directusActionRequest<DirectusItemResponse<Order>>(
    `/items/customer_orders/${encodeURIComponent(orderId)}?fields=id,customer_id,payment_mode,order_status`,
    undefined,
    session
  );

  if (!order.data.data.customer_id) {
    throw new Error("This order is not linked to a customer.");
  }

  if (order.data.data.payment_mode !== "utang" || order.data.data.order_status !== "pending") {
    throw new Error("Only pending utang order quantities can be edited.");
  }

  await directusActionRequest(
    `/items/order_items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        quantity: Number(quantity)
      })
    },
    order.session
  );

  return {
    order: await recalculateCustomerOrderTotal(orderId, order.session)
  };
}

export async function removeAdminOrderItemFromCustomer(orderId: string, itemId: string) {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  const order = await directusActionRequest<DirectusItemResponse<Order>>(
    `/items/customer_orders/${encodeURIComponent(orderId)}?fields=id,customer_id,payment_mode,order_status`,
    undefined,
    session
  );

  if (!order.data.data.customer_id) {
    throw new Error("This order is not linked to a customer.");
  }

  if (order.data.data.payment_mode !== "utang" || order.data.data.order_status !== "pending") {
    throw new Error("Only pending utang order items can be removed.");
  }
  await directusActionRequest(
    `/items/order_items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        order_id: null
      })
    },
    order.session
  );
  const updatedOrder = await recalculateCustomerOrderTotal(orderId, order.session);

  return {
    order: updatedOrder
  };
}
