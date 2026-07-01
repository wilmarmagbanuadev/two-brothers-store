import { NextResponse } from "next/server";

import {
  adminAccessCookie,
  adminRefreshCookie,
  cookieOptions,
  decryptSessionValue,
  encryptSessionValue
} from "@/lib/admin-session";
import { refreshDirectusSession } from "@/lib/directus-refresh";

const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const directusToken = process.env.DIRECTUS_STATIC_TOKEN;

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status = 500
  ) {
    super(message);
  }
}

type AdminSession = {
  accessToken: string;
  refreshToken?: string;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expires: number;
  };
};

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split("=")[1];
}

function sessionFromRequest(request: Request): AdminSession {
  const encryptedAccessToken = cookieValue(request, adminAccessCookie);
  const encryptedRefreshToken = cookieValue(request, adminRefreshCookie);
  const refreshToken = encryptedRefreshToken ? decryptSessionValue(decodeURIComponent(encryptedRefreshToken)) : undefined;

  if (encryptedAccessToken) {
    return {
      accessToken: decryptSessionValue(decodeURIComponent(encryptedAccessToken)),
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

  throw new AdminApiError("Please log in as an admin to manage products.", 401);
}

async function refreshSession(session: AdminSession) {
  if (!session.refreshToken) {
    throw new AdminApiError("Your admin session has expired. Please log in again.", 401);
  }

  let refreshed;

  try {
    refreshed = await refreshDirectusSession(session.refreshToken);
  } catch {
    throw new AdminApiError("Your admin session has expired. Please log in again.", 401);
  }

  session.accessToken = refreshed.accessToken;
  session.refreshToken = refreshed.refreshToken;
  session.refreshed = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expires: refreshed.expires
  };
}

export async function adminDirectusRequest(request: Request, path: string, init?: RequestInit, session = sessionFromRequest(request)) {
  if (!session.accessToken && session.refreshToken) {
    await refreshSession(session);
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
    await refreshSession(session);
    response = await runRequest();
  }

  if (!response.ok) {
    throw new AdminApiError(await friendlyDirectusError(response), response.status);
  }

  return {
    data: await response.json(),
    session
  };
}

export function applyRefreshedSessionCookies(response: NextResponse, session?: AdminSession) {
  if (!session?.refreshed) {
    return response;
  }

  const maxAgeSeconds = Math.max(60, Math.floor(session.refreshed.expires / 1000));

  response.cookies.set(adminAccessCookie, encryptSessionValue(session.refreshed.accessToken), cookieOptions(maxAgeSeconds));
  response.cookies.set(adminRefreshCookie, encryptSessionValue(session.refreshed.refreshToken), cookieOptions(60 * 60 * 24 * 30));

  return response;
}

export function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof AdminApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;

  return NextResponse.json({ error: message }, { status });
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
    return "Your  session has expired. Please log in again.";
  }

  if (response.status === 403) {
    return "Your  account does not have permission to manage products.";
  }

  if (response.status === 400) {
    return "Please check the details and try again.";
  }

  return "Something went wrong while saving the record. Please try again.";
}
