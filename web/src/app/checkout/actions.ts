"use server";

import {
  currentCustomer,
  customerDirectusRequest,
  customerSessionFromCookies
} from "@/lib/customer-directus";

type CheckoutItem = {
  id: string;
  quantity: number;
};

export type CheckoutPayload = {
  items: CheckoutItem[];
  fullName?: string;
  phone?: string;
  deliveryAddress?: string;
  paymentMode?: "cash" | "utang";
  notes?: string;
};

type DirectusListResponse<T> = {
  data: T[];
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

type DirectusProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: string | number;
};

function moneyNumber(value: string | number) {
  return Number(value);
}

function customerName(user: DirectusUser, fallback?: string) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  return fallback?.trim() || name || user.email || "Customer";
}

export async function checkoutCustomer(payload: CheckoutPayload) {
  const session = await customerSessionFromCookies();
  const user = await currentCustomer(session);

  const items = payload.items.filter((item) => item.id && Number(item.quantity) > 0);

  if (!items.length) {
    throw new Error("Your cart is empty.");
  }

  const productParams = new URLSearchParams({
    fields: "id,name,slug,sku,price"
  });

  items.forEach((item, index) => {
    productParams.set(`filter[slug][_in][${index}]`, item.id);
  });

  const products = await customerDirectusRequest<DirectusListResponse<DirectusProduct>>(
    session,
    `/items/products?${productParams.toString()}`
  );
  const productBySlug = new Map(products.data.map((product) => [product.slug, product]));

  if (productBySlug.size !== items.length) {
    throw new Error("Some cart items are no longer available.");
  }

  const paymentMode = payload.paymentMode ?? "utang";
  const subtotal = items.reduce((total, item) => {
    const product = productBySlug.get(item.id);

    return total + (product ? moneyNumber(product.price) * Number(item.quantity) : 0);
  }, 0);
  const order = await customerDirectusRequest<DirectusItemResponse<{ id: string; order_number: string }>>(
    session,
    "/items/customer_orders",
    {
      method: "POST",
      body: JSON.stringify({
        customer_id: user.id,
        customer_name: customerName(user, payload.fullName),
        customer_email: user.email,
        customer_phone: payload.phone?.trim() || null,
        delivery_address: payload.deliveryAddress?.trim() || null,
        fulfillment_method: "pickup",
        order_status: "pending",
        payment_status: paymentMode === "utang" ? "unpaid" : "paid",
        payment_mode: paymentMode,
        subtotal,
        delivery_fee: 0,
        total: subtotal,
        notes: payload.notes?.trim() || null
      })
    }
  );

  await Promise.all(
    items.map((item) => {
      const product = productBySlug.get(item.id)!;

      return customerDirectusRequest(session, "/items/order_items", {
        method: "POST",
        body: JSON.stringify({
          order_id: order.data.id,
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: Number(item.quantity),
          unit_price: moneyNumber(product.price),
          status: "active"
        })
      });
    })
  );

  return {
    order: order.data
  };
}
