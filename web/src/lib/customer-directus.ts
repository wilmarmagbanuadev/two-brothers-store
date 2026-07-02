import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  cookieOptions,
  decryptSessionValue,
  encryptSessionValue,
  userAccessCookie,
  userRefreshCookie
} from "@/lib/admin-session";
import { refreshDirectusSession } from "@/lib/directus-refresh";
import { roleNameFromAccessToken } from "@/lib/directus-role";
import { directusSystemRequest } from "@/lib/directus-system";

const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";

export type CustomerSession = {
  accessToken: string;
  refreshToken?: string;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expires: number;
  };
};

type DirectusMeResponse = {
  data: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    location: string | null;
    status?: string | null;
    role?: string | {
      id?: string;
      name?: string;
    };
  };
};

type DirectusCustomerStatusResponse = {
  data?: {
    status?: string | null;
  };
};

export async function customerSessionFromCookies(): Promise<CustomerSession> {
  const cookieStore = await cookies();
  const encryptedAccessToken = cookieStore.get(userAccessCookie)?.value;
  const encryptedRefreshToken = cookieStore.get(userRefreshCookie)?.value;
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

  throw new Error("Please log in as a customer.");
}

async function saveRefreshedCustomerSession(session: CustomerSession) {
  if (!session.refreshed) {
    return;
  }

  const cookieStore = await cookies();
  const maxAgeSeconds = Math.max(60, Math.floor(session.refreshed.expires / 1000));

  cookieStore.set(userAccessCookie, encryptSessionValue(session.refreshed.accessToken), cookieOptions(maxAgeSeconds));
  cookieStore.set(userRefreshCookie, encryptSessionValue(session.refreshed.refreshToken), cookieOptions(60 * 60 * 24 * 30));
}

async function refreshCustomerSession(session: CustomerSession) {
  if (!session.refreshToken) {
    throw new Error("Your customer session has expired. Please log in again.");
  }

  let refreshed;

  try {
    refreshed = await refreshDirectusSession(session.refreshToken);
  } catch {
    throw new Error("Your customer session has expired. Please log in again.");
  }

  session.accessToken = refreshed.accessToken;
  session.refreshToken = refreshed.refreshToken;
  session.refreshed = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expires: refreshed.expires
  };

  await saveRefreshedCustomerSession(session);
}

export async function customerDirectusRequest<T>(
  session: CustomerSession,
  path: string,
  init?: RequestInit
) {
  if (!session.accessToken && session.refreshToken) {
    await refreshCustomerSession(session);
  }

  const runRequest = () =>
    fetch(`${directusUrl.replace(/\/$/, "")}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers
      }
    });

  let response = await runRequest();

  if (response.status === 401 && session.refreshToken) {
    await refreshCustomerSession(session);
    response = await runRequest();
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your customer session has expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("Your customer account does not have permission to access this information.");
    }

    throw new Error("Unable to load your account information. Please try again.");
  }

  await saveRefreshedCustomerSession(session);

  return response.status === 204 ? null as T : await response.json() as Promise<T>;
}

export async function currentCustomer(session: CustomerSession) {
  const response = await customerDirectusRequest<DirectusMeResponse>(
    session,
    "/users/me?fields=id,email,first_name,last_name,location,status,role,role.name"
  );
  const role = response.data.role;
  const roleName = (typeof role === "object" ? role.name : null)
    ?? await roleNameFromAccessToken(session.accessToken);

  if (roleName !== "Customer") {
    throw new Error("Please use a customer account.");
  }

  let status = response.data.status;

  if (!status) {
    const statusResponse = await directusSystemRequest<DirectusCustomerStatusResponse>(
      `/users/${encodeURIComponent(response.data.id)}?fields=status`
    );
    status = statusResponse?.data?.status;
  }

  if (status !== "active") {
    redirect("/auth/customer/suspended");
  }

  return response.data;
}
