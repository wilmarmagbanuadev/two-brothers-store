"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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

type UtangOrder = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  total: string | number;
  date_created: string;
  payment_status: string;
};

type Payment = {
  id: string;
  customer_id: string;
  amount: string | number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  received_by: string | null;
  status: string;
};

type Allocation = {
  id: string;
  payment_id: string;
  order_id: string;
  amount: string | number;
};

export type CustomerLedger = {
  email: string;
  name: string;
  totalUtang: number;
  totalPaid: number;
  balance: number;
  openOrders: number;
};

export type AdminPaymentHistory = {
  id: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes: string | null;
  receivedBy: string | null;
};

export type RecordCustomerPaymentPayload = {
  customerEmail: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
  receivedBy?: string;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function displayName(user: DirectusUser) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.email || "Customer";
}

function buildLedgers(users: DirectusUser[], orders: UtangOrder[], allocations: Allocation[]) {
  const allocatedByOrder = new Map<string, number>();

  allocations.forEach((allocation) => {
    allocatedByOrder.set(
      allocation.order_id,
      roundMoney((allocatedByOrder.get(allocation.order_id) ?? 0) + Number(allocation.amount))
    );
  });

  return users
    .filter((user): user is DirectusUser & { email: string } => Boolean(user.email))
    .map<CustomerLedger>((user) => {
      const customerOrders = orders.filter((order) => order.customer_id === user.id);
      const totalUtang = roundMoney(customerOrders.reduce((sum, order) => sum + Number(order.total), 0));
      const totalPaid = roundMoney(
        customerOrders.reduce(
          (sum, order) => sum + Math.min(Number(order.total), allocatedByOrder.get(order.id) ?? 0),
          0
        )
      );

      return {
        email: user.email,
        name: displayName(user),
        totalUtang,
        totalPaid,
        balance: roundMoney(Math.max(0, totalUtang - totalPaid)),
        openOrders: customerOrders.filter(
          (order) => roundMoney(Number(order.total) - (allocatedByOrder.get(order.id) ?? 0)) > 0
        ).length
      };
    })
    .filter((ledger) => ledger.totalUtang > 0 || ledger.totalPaid > 0);
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
    return { accessToken: directusToken };
  }

  throw new Error("Please log in as an admin to manage payments.");
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

async function directusRequest<T>(path: string, init?: RequestInit, session?: AdminSession) {
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
    if (response.status === 401) {
      throw new Error("Your admin session has expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("Your admin account does not have permission to manage payments.");
    }

    throw new Error("Unable to save payment information. Please try again.");
  }

  await saveRefreshedSession(activeSession);

  return {
    data: response.status === 204 ? null as T : await response.json() as T,
    session: activeSession
  };
}

async function assertAdmin(session: AdminSession) {
  if (!session.accessToken && session.refreshToken) {
    await refreshSession(session);
  }

  if (await roleNameFromAccessToken(session.accessToken) !== "Admin") {
    throw new Error("Please use an admin account to manage payments.");
  }
}

async function customerUsers(
  session: AdminSession,
  options?: { page: number; limit: number; search: string }
) {
  const role = await directusRequest<DirectusListResponse<{ id: string }>>(
    "/roles?fields=id&filter[name][_eq]=Customer&limit=1",
    undefined,
    session
  );
  const roleId = role.data.data[0]?.id;

  if (!roleId) {
    throw new Error("Customer role was not found in Directus.");
  }

  const params = new URLSearchParams({
    fields: "id,email,first_name,last_name",
    "filter[role][_eq]": roleId,
    sort: "first_name,last_name,email",
    limit: String(options?.limit ?? 500)
  });

  if (options) {
    params.set("page", String(options.page));
    params.set("meta", "filter_count");

    if (options.search) {
      params.set("filter[_or][0][first_name][_icontains]", options.search);
      params.set("filter[_or][1][last_name][_icontains]", options.search);
      params.set("filter[_or][2][email][_icontains]", options.search);
    }
  }

  return directusRequest<DirectusListResponse<DirectusUser>>(
    `/users?${params.toString()}`,
    undefined,
    role.session
  );
}

async function ledgerRecords(session: AdminSession, paymentPage: number, paymentLimit: number) {
  const orders = await directusRequest<DirectusListResponse<UtangOrder>>(
    "/items/customer_orders?fields=id,order_number,customer_id,customer_name,total,date_created,payment_status&filter[payment_mode][_eq]=utang&filter[order_status][_eq]=confirmed&sort=date_created&limit=1000",
    undefined,
    session
  );
  const allocations = await directusRequest<DirectusListResponse<Allocation>>(
    "/items/payment_allocations?fields=id,payment_id,order_id,amount&filter[payment_id][status][_eq]=published&limit=5000",
    undefined,
    orders.session
  );
  const payments = await directusRequest<DirectusListResponse<Payment>>(
    `/items/customer_payments?fields=id,customer_id,amount,payment_date,payment_method,notes,received_by,status&filter[status][_eq]=published&meta=filter_count&sort=-payment_date&page=${paymentPage}&limit=${paymentLimit}`,
    undefined,
    allocations.session
  );

  return {
    orders: orders.data.data,
    allocations: allocations.data.data,
    payments: payments.data.data,
    paymentCount: Number(payments.data.meta?.filter_count ?? payments.data.data.length),
    session: payments.session
  };
}

export async function loadAdminUtangData(options?: {
  balancePage?: number;
  balanceLimit?: number;
  balanceSearch?: string;
  paymentPage?: number;
  paymentLimit?: number;
}) {
  const session = await sessionFromCookies();
  await assertAdmin(session);

  const balancePage = Math.max(1, Number(options?.balancePage) || 1);
  const balanceLimit = Math.min(50, Math.max(5, Number(options?.balanceLimit) || 10));
  const paymentPage = Math.max(1, Number(options?.paymentPage) || 1);
  const paymentLimit = Math.min(50, Math.max(5, Number(options?.paymentLimit) || 10));
  const allUsers = await customerUsers(session);
  const users = await customerUsers(allUsers.session, {
    page: balancePage,
    limit: balanceLimit,
    search: options?.balanceSearch?.trim() ?? ""
  });
  const records = await ledgerRecords(users.session, paymentPage, paymentLimit);
  const userById = new Map(allUsers.data.data.map((user) => [user.id, user]));
  const ledgers = buildLedgers(users.data.data, records.orders, records.allocations);
  const allLedgers = buildLedgers(allUsers.data.data, records.orders, records.allocations);

  const paymentHistory = records.payments.map<AdminPaymentHistory>((payment) => {
    const user = userById.get(payment.customer_id);

    return {
      id: payment.id,
      customerEmail: user?.email ?? "",
      customerName: user ? displayName(user) : "Customer",
      amount: Number(payment.amount),
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method || "cash",
      notes: payment.notes,
      receivedBy: payment.received_by
    };
  });

  return {
    ledgers,
    paymentHistory,
    totalBalance: roundMoney(allLedgers.reduce((sum, ledger) => sum + ledger.balance, 0)),
    balancePagination: {
      page: balancePage,
      limit: balanceLimit,
      totalItems: Number(users.data.meta?.filter_count ?? users.data.data.length),
      totalPages: Math.max(
        1,
        Math.ceil(Number(users.data.meta?.filter_count ?? users.data.data.length) / balanceLimit)
      )
    },
    paymentPagination: {
      page: paymentPage,
      limit: paymentLimit,
      totalItems: records.paymentCount,
      totalPages: Math.max(1, Math.ceil(records.paymentCount / paymentLimit))
    }
  };
}

export async function searchAdminPaymentCustomers(search: string) {
  const session = await sessionFromCookies();
  await assertAdmin(session);

  const users = await customerUsers(session, {
    page: 1,
    limit: 8,
    search: search.trim()
  });
  const records = await ledgerRecords(users.session, 1, 5);

  return buildLedgers(users.data.data, records.orders, records.allocations)
    .filter((ledger) => ledger.balance > 0);
}

export async function recordCustomerPayment(payload: RecordCustomerPaymentPayload) {
  const session = await sessionFromCookies();
  await assertAdmin(session);

  const amount = roundMoney(Number(payload.amount));

  if (!payload.customerEmail || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Choose a customer and enter a valid payment amount.");
  }

  const users = await customerUsers(session);
  const customer = users.data.data.find(
    (user) => user.email?.toLowerCase() === payload.customerEmail.trim().toLowerCase()
  );

  if (!customer) {
    throw new Error("The selected customer account was not found.");
  }

  const orders = await directusRequest<DirectusListResponse<UtangOrder>>(
    `/items/customer_orders?fields=id,order_number,customer_id,customer_name,total,date_created,payment_status&filter[customer_id][_eq]=${encodeURIComponent(customer.id)}&filter[payment_mode][_eq]=utang&filter[order_status][_eq]=confirmed&sort=date_created&limit=1000`,
    undefined,
    users.session
  );
  const allocations = await directusRequest<DirectusListResponse<Allocation>>(
    `/items/payment_allocations?fields=id,payment_id,order_id,amount&filter[order_id][customer_id][_eq]=${encodeURIComponent(customer.id)}&filter[payment_id][status][_eq]=published&limit=5000`,
    undefined,
    orders.session
  );
  const allocatedByOrder = new Map<string, number>();

  allocations.data.data.forEach((allocation) => {
    allocatedByOrder.set(
      allocation.order_id,
      roundMoney((allocatedByOrder.get(allocation.order_id) ?? 0) + Number(allocation.amount))
    );
  });

  const openOrders = orders.data.data
    .map((order) => ({
      ...order,
      balance: roundMoney(Math.max(0, Number(order.total) - (allocatedByOrder.get(order.id) ?? 0)))
    }))
    .filter((order) => order.balance > 0);
  const availableBalance = roundMoney(openOrders.reduce((sum, order) => sum + order.balance, 0));

  if (availableBalance <= 0) {
    throw new Error("This customer has no outstanding utang balance.");
  }

  if (amount > availableBalance) {
    throw new Error(`Payment cannot be greater than the remaining balance of PHP ${availableBalance.toFixed(2)}.`);
  }

  const payment = await directusRequest<DirectusItemResponse<Payment>>(
    "/items/customer_payments",
    {
      method: "POST",
      body: JSON.stringify({
        status: "draft",
        customer_id: customer.id,
        amount,
        payment_date: payload.paymentDate || new Date().toISOString(),
        payment_method: payload.paymentMethod || "cash",
        notes: payload.notes?.trim() || null,
        received_by: payload.receivedBy?.trim() || null
      })
    },
    allocations.session
  );

  let remaining = amount;
  const paidOrderIds: string[] = [];

  for (const order of openOrders) {
    if (remaining <= 0) {
      break;
    }

    const allocationAmount = roundMoney(Math.min(remaining, order.balance));

    await directusRequest(
      "/items/payment_allocations",
      {
        method: "POST",
        body: JSON.stringify({
          status: "published",
          payment_id: payment.data.data.id,
          order_id: order.id,
          amount: allocationAmount
        })
      },
      payment.session
    );

    remaining = roundMoney(remaining - allocationAmount);

    if (allocationAmount >= order.balance) {
      paidOrderIds.push(order.id);
    }
  }

  await directusRequest(
    `/items/customer_payments/${encodeURIComponent(payment.data.data.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "published" })
    },
    payment.session
  );

  await Promise.all(
    paidOrderIds.map((orderId) =>
      directusRequest(
        `/items/customer_orders/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ payment_status: "paid" })
        },
        payment.session
      )
    )
  );

  revalidatePath("/dashboard/admin/utang");
  revalidatePath("/dashboard/user/utang");
  revalidatePath("/dashboard/user/payments");

  return {
    paymentId: payment.data.data.id,
    allocatedAmount: roundMoney(amount - remaining),
    remainingBalance: roundMoney(availableBalance - amount)
  };
}
