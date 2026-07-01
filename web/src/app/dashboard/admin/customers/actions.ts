"use server";

import { revalidatePath } from "next/cache";

import {
  adminServerDirectusRequest,
  adminSessionFromCookies,
  assertAdminServerSession,
  type AdminServerSession
} from "@/lib/admin-server-directus";

type DirectusListResponse<T> = {
  data: T[];
  meta?: {
    filter_count?: number;
  };
};

type DirectusItemResponse<T> = {
  data: T;
};

export type AdminCustomer = {
  email: string;
  firstName: string;
  lastName: string;
  status: string;
};

type DirectusCustomer = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
};

export type LoadAdminCustomersParams = {
  page: number;
  limit: number;
  status: "all" | "active" | "suspended" | "archived";
  search: string;
};

export type SaveCustomerPayload = {
  originalEmail?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  status?: "active" | "suspended" | "archived";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validatePayload(payload: SaveCustomerPayload, isEditing: boolean) {
  const email = normalizeEmail(payload.email);

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  if (!isEditing && (!payload.password || payload.password.length < 8)) {
    throw new Error("The password must contain at least 8 characters.");
  }

  if (payload.password && payload.password.length < 8) {
    throw new Error("The new password must contain at least 8 characters.");
  }

  return {
    email,
    first_name: payload.firstName?.trim() || null,
    last_name: payload.lastName?.trim() || null,
    status: payload.status ?? "active",
    ...(payload.password ? { password: payload.password } : {})
  };
}

async function customerRoleId(session: AdminServerSession) {
  const roles = await adminServerDirectusRequest<DirectusListResponse<{ id: string }>>(
    session,
    "/roles?fields=id&filter[name][_eq]=Customer&limit=1"
  );
  const roleId = roles.data[0]?.id;

  if (!roleId) {
    throw new Error("The Customer role was not found in Directus.");
  }

  return roleId;
}

async function findCustomerByEmail(session: AdminServerSession, roleId: string, email: string) {
  const params = new URLSearchParams({
    fields: "id,email,first_name,last_name,status",
    "filter[email][_eq]": normalizeEmail(email),
    "filter[role][_eq]": roleId,
    limit: "1"
  });
  const users = await adminServerDirectusRequest<DirectusListResponse<DirectusCustomer>>(
    session,
    `/users?${params.toString()}`
  );

  return users.data[0];
}

export async function loadAdminCustomers(params: LoadAdminCustomersParams) {
  const session = await adminSessionFromCookies();
  await assertAdminServerSession(session);

  const roleId = await customerRoleId(session);
  const page = clamp(Number(params.page) || 1, 1, 100000);
  const limit = clamp(Number(params.limit) || 10, 5, 50);
  const query = new URLSearchParams({
    fields: "email,first_name,last_name,status",
    meta: "filter_count",
    page: String(page),
    limit: String(limit),
    sort: "first_name,last_name,email",
    "filter[role][_eq]": roleId
  });
  const search = params.search.trim();

  if (params.status !== "all") {
    query.set("filter[status][_eq]", params.status);
  }

  if (search) {
    query.set("filter[_or][0][first_name][_icontains]", search);
    query.set("filter[_or][1][last_name][_icontains]", search);
    query.set("filter[_or][2][email][_icontains]", search);
  }

  const response = await adminServerDirectusRequest<DirectusListResponse<DirectusCustomer>>(
    session,
    `/users?${query.toString()}`
  );
  const totalItems = Number(response.meta?.filter_count ?? response.data.length);

  return {
    customers: response.data
      .filter((customer): customer is DirectusCustomer & { email: string } => Boolean(customer.email))
      .map<AdminCustomer>((customer) => ({
        email: customer.email,
        firstName: customer.first_name ?? "",
        lastName: customer.last_name ?? "",
        status: customer.status
      })),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit))
    }
  };
}

export async function createAdminCustomer(payload: SaveCustomerPayload) {
  const session = await adminSessionFromCookies();
  await assertAdminServerSession(session);

  const roleId = await customerRoleId(session);
  const customer = validatePayload(payload, false);
  const created = await adminServerDirectusRequest<DirectusItemResponse<DirectusCustomer>>(
    session,
    "/users",
    {
      method: "POST",
      body: JSON.stringify({
        ...customer,
        role: roleId
      })
    }
  );

  revalidatePath("/dashboard/admin/customers");

  return {
    customer: {
      email: created.data.email ?? customer.email,
      firstName: created.data.first_name ?? "",
      lastName: created.data.last_name ?? "",
      status: created.data.status
    } satisfies AdminCustomer
  };
}

export async function updateAdminCustomer(payload: SaveCustomerPayload) {
  const session = await adminSessionFromCookies();
  await assertAdminServerSession(session);

  if (!payload.originalEmail) {
    throw new Error("Choose a customer to edit.");
  }

  const roleId = await customerRoleId(session);
  const existing = await findCustomerByEmail(session, roleId, payload.originalEmail);

  if (!existing) {
    throw new Error("The selected Customer user was not found.");
  }

  const customer = validatePayload(payload, true);
  const updated = await adminServerDirectusRequest<DirectusItemResponse<DirectusCustomer>>(
    session,
    `/users/${encodeURIComponent(existing.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...customer,
        role: roleId
      })
    }
  );

  revalidatePath("/dashboard/admin/customers");

  return {
    customer: {
      email: updated.data.email ?? customer.email,
      firstName: updated.data.first_name ?? "",
      lastName: updated.data.last_name ?? "",
      status: updated.data.status
    } satisfies AdminCustomer
  };
}
