"use server";

import { cookies } from "next/headers";

import {
  adminAccessCookie,
  adminRefreshCookie,
  cookieOptions,
  decryptSessionValue,
  encryptSessionValue
} from "@/lib/admin-session";
import { refreshDirectusSession } from "@/lib/directus-refresh";
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
    total_count?: number;
  };
};

type DirectusItemResponse<T> = {
  data: T;
};

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

export type ProductPayload = {
  name: string;
  slug: string;
  sku?: string;
  barcode?: string;
  description?: string;
  price: number;
  image_url?: string;
  is_featured?: boolean;
  status?: "draft" | "active" | "archived";
  stock_quantity?: number;
  category_id?: string | null;
};

export type LoadAdminProductsParams = {
  page: number;
  limit: number;
  status: "all" | "draft" | "active" | "archived";
  search: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeProductPayload(payload: ProductPayload) {
  return {
    name: payload.name,
    slug: payload.slug,
    sku: payload.sku?.trim() || null,
    barcode: payload.barcode?.trim() || null,
    description: payload.description ?? "",
    price: payload.price,
    image_url: payload.image_url ?? "",
    is_featured: Boolean(payload.is_featured),
    status: payload.status ?? "active",
    stock_quantity: payload.stock_quantity ?? 0,
    category_id: payload.category_id || null
  };
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

  throw new Error("Please log in as an admin to manage products.");
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
  } catch {
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

  const roleName = await roleNameFromAccessToken(session.accessToken);

  if (roleName !== "Admin") {
    throw new Error("Please use an admin account to manage products.");
  }
}

async function friendlyDirectusError(response: Response) {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return "Something went wrong while contacting the product database.";
  }

  const firstError = typeof payload === "object" && payload !== null && "errors" in payload
    ? (payload.errors as Array<{ extensions?: { code?: string; field?: string } }> | undefined)?.[0]
    : undefined;

  if (firstError?.extensions?.code === "RECORD_NOT_UNIQUE" && firstError.extensions.field === "slug") {
    return "A product with this slug already exists. Please choose a different slug.";
  }

  if (firstError?.extensions?.code === "RECORD_NOT_UNIQUE" && firstError.extensions.field === "sku") {
    return "A product with this SKU already exists. Please choose a different SKU.";
  }

  if (firstError?.extensions?.code === "RECORD_NOT_UNIQUE" && firstError.extensions.field === "barcode") {
    return "A product with this barcode already exists. Please choose a different barcode.";
  }

  if (response.status === 401) {
    return "Your admin session has expired. Please log in again.";
  }

  if (response.status === 403) {
    return "Your admin account does not have permission to manage products.";
  }

  if (response.status === 400) {
    return "Please check the details and try again.";
  }

  return "Something went wrong while saving the record. Please try again.";
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

  let response = await runRequest();

  if (response.status === 401 && activeSession.refreshToken) {
    await refreshSession(activeSession);
    response = await runRequest();
  }

  if (!response.ok) {
    throw new Error(await friendlyDirectusError(response));
  }

  await saveRefreshedSession(activeSession);

  return {
    data: await response.json() as T,
    session: activeSession
  };
}

export async function loadAdminProducts(options: LoadAdminProductsParams) {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  const page = clamp(Number(options.page) || 1, 1, 10_000);
  const limit = clamp(Number(options.limit) || 10, 5, 100);
  const search = options.search?.trim() ?? "";
  const status = options.status ?? "all";
  const params = new URLSearchParams({
    fields: "id,name,slug,sku,barcode,description,price,image_url,is_featured,status,stock_quantity,category_id.id,category_id.name,category_id.slug",
    sort: "name",
    page: String(page),
    limit: String(limit),
    meta: "filter_count,total_count"
  });

  if (["draft", "active", "archived"].includes(status)) {
    params.set("filter[status][_eq]", status);
  }

  if (search) {
    params.set("filter[_or][0][name][_icontains]", search);
    params.set("filter[_or][1][slug][_icontains]", search);
    params.set("filter[_or][2][sku][_icontains]", search);
    params.set("filter[_or][3][barcode][_icontains]", search);
    params.set("filter[_or][4][category_id][name][_icontains]", search);
  }

  const products = await directusActionRequest<DirectusListResponse<AdminProduct>>(`/items/products?${params.toString()}`, undefined, session);
  const categories = await directusActionRequest<DirectusListResponse<AdminCategory>>(
    "/items/categories?fields=id,name,slug&filter[is_active][_eq]=true&sort=sort_order",
    undefined,
    products.session
  );
  const totalItems = Number(products.data.meta?.filter_count ?? products.data.data.length);
  const totalProducts = Number(products.data.meta?.total_count ?? totalItems);

  return {
    products: products.data.data,
    categories: categories.data.data,
    pagination: {
      page,
      limit,
      totalItems,
      totalProducts,
      totalPages: Math.max(1, Math.ceil(totalItems / limit))
    }
  };
}

export async function loadAdminProductOfflineCatalog() {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  const products: AdminProduct[] = [];
  let activeSession = session;
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      fields: "id,name,slug,sku,barcode,description,price,image_url,is_featured,status,stock_quantity,category_id.id,category_id.name,category_id.slug",
      sort: "name",
      page: String(page),
      limit: "100",
      meta: "filter_count"
    });
    const result = await directusActionRequest<DirectusListResponse<AdminProduct>>(
      `/items/products?${params.toString()}`,
      undefined,
      activeSession
    );
    const pageProducts = result.data.data;

    products.push(...pageProducts);
    activeSession = result.session;

    const totalItems = Number(result.data.meta?.filter_count ?? 0);

    if (!pageProducts.length || pageProducts.length < 100 || (totalItems > 0 && products.length >= totalItems)) {
      break;
    }

    page += 1;
  }

  const categories = await directusActionRequest<DirectusListResponse<AdminCategory>>(
    "/items/categories?fields=id,name,slug&filter[is_active][_eq]=true&sort=sort_order",
    undefined,
    activeSession
  );

  return {
    products,
    categories: categories.data.data,
    updatedAt: new Date().toISOString()
  };
}

export async function createAdminProduct(payload: ProductPayload) {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  const product = await directusActionRequest<DirectusItemResponse<AdminProduct>>(
    "/items/products",
    {
      method: "POST",
      body: JSON.stringify(normalizeProductPayload(payload))
    },
    session
  );

  return {
    product: product.data.data
  };
}

export async function updateAdminProduct(id: string, payload: ProductPayload) {
  const session = await sessionFromCookies();

  await assertAdminSession(session);

  const product = await directusActionRequest<DirectusItemResponse<AdminProduct>>(
    `/items/products/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(normalizeProductPayload(payload))
    },
    session
  );

  return {
    product: product.data.data
  };
}
