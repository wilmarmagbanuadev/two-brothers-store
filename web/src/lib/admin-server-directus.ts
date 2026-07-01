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

export type AdminServerSession = {
  accessToken: string;
  refreshToken?: string;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expires: number;
  };
};

export async function adminSessionFromCookies(): Promise<AdminServerSession> {
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

  throw new Error("Please log in as an admin.");
}

async function saveRefreshedSession(session: AdminServerSession) {
  if (!session.refreshed) {
    return;
  }

  const cookieStore = await cookies();
  const maxAgeSeconds = Math.max(60, Math.floor(session.refreshed.expires / 1000));

  cookieStore.set(adminAccessCookie, encryptSessionValue(session.refreshed.accessToken), cookieOptions(maxAgeSeconds));
  cookieStore.set(adminRefreshCookie, encryptSessionValue(session.refreshed.refreshToken), cookieOptions(60 * 60 * 24 * 30));
}

async function refreshAdminSession(session: AdminServerSession) {
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

async function friendlyAdminError(response: Response) {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return "Unable to contact the customer database. Please try again.";
  }

  const firstError = typeof payload === "object" && payload !== null && "errors" in payload
    ? (payload.errors as Array<{ extensions?: { code?: string; field?: string } }> | undefined)?.[0]
    : undefined;

  if (firstError?.extensions?.code === "RECORD_NOT_UNIQUE" && firstError.extensions.field === "email") {
    return "A user with this email address already exists.";
  }

  if (response.status === 400) {
    return "Please check the customer details and try again.";
  }

  if (response.status === 401) {
    return "Your admin session has expired. Please log in again.";
  }

  if (response.status === 403) {
    return "Your admin account does not have permission to manage customers.";
  }

  return "Unable to save the customer. Please try again.";
}

export async function adminServerDirectusRequest<T>(
  session: AdminServerSession,
  path: string,
  init?: RequestInit
) {
  if (!session.accessToken && session.refreshToken) {
    await refreshAdminSession(session);
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
    await refreshAdminSession(session);
    response = await runRequest();
  }

  if (!response.ok) {
    throw new Error(await friendlyAdminError(response));
  }

  await saveRefreshedSession(session);

  return response.status === 204 ? null as T : await response.json() as Promise<T>;
}

export async function assertAdminServerSession(session: AdminServerSession) {
  if (!session.accessToken && session.refreshToken) {
    await refreshAdminSession(session);
  }

  if (await roleNameFromAccessToken(session.accessToken) !== "Admin") {
    throw new Error("Please use an Admin account to manage customers.");
  }
}
