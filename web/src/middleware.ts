import { NextRequest, NextResponse } from "next/server";

import {
  adminAccessCookie,
  adminRefreshCookie,
  cookieOptions,
  decryptSessionValue,
  encryptSessionValue,
  userAccessCookie,
  userRefreshCookie
} from "@/lib/admin-session";
import { DirectusRefreshError, refreshDirectusSession } from "@/lib/directus-refresh";

type SessionCookiePair = {
  access: string;
  refresh: string;
  signInPath: string;
  protectedPaths: string[];
};

const customerCookies: SessionCookiePair = {
  access: userAccessCookie,
  refresh: userRefreshCookie,
  signInPath: "/sign-in/user",
  protectedPaths: ["/dashboard/user", "/checkout", "/cart"]
};

const adminCookies: SessionCookiePair = {
  access: adminAccessCookie,
  refresh: adminRefreshCookie,
  signInPath: "/sign-in/admin",
  protectedPaths: ["/dashboard/admin"]
};

function accessTokenNeedsRefresh(encryptedAccessToken?: string) {
  if (!encryptedAccessToken) {
    return true;
  }

  try {
    const accessToken = decryptSessionValue(encryptedAccessToken);
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8")) as {
      exp?: number;
    };

    return !payload.exp || payload.exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

function isProtectedPath(pathname: string, session: SessionCookiePair) {
  return session.protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function responseWithRequestCookies(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-two-brothers-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers
    }
  });
}

function clearSessionCookies(request: NextRequest, session: SessionCookiePair) {
  request.cookies.delete(session.access);
  request.cookies.delete(session.refresh);

  const response = responseWithRequestCookies(request);
  response.cookies.set(session.access, "", cookieOptions(0));
  response.cookies.set(session.refresh, "", cookieOptions(0));

  return response;
}

async function refreshSession(request: NextRequest, session: SessionCookiePair) {
  const encryptedAccessToken = request.cookies.get(session.access)?.value;

  if (!accessTokenNeedsRefresh(encryptedAccessToken)) {
    return null;
  }

  const encryptedRefreshToken = request.cookies.get(session.refresh)?.value;

  if (!encryptedRefreshToken) {
    return null;
  }

  try {
    const refreshToken = decryptSessionValue(encryptedRefreshToken);
    const refreshed = await refreshDirectusSession(refreshToken);
    const accessValue = encryptSessionValue(refreshed.accessToken);
    const refreshValue = encryptSessionValue(refreshed.refreshToken);
    const accessMaxAge = Math.max(60, Math.floor(refreshed.expires / 1000));

    request.cookies.set(session.access, accessValue);
    request.cookies.set(session.refresh, refreshValue);

    const response = responseWithRequestCookies(request);
    response.cookies.set(session.access, accessValue, cookieOptions(accessMaxAge));
    response.cookies.set(session.refresh, refreshValue, cookieOptions(60 * 60 * 24 * 30));

    return response;
  } catch (error) {
    if (error instanceof DirectusRefreshError && error.reason === "unavailable") {
      return responseWithRequestCookies(request);
    }

    if (isProtectedPath(request.nextUrl.pathname, session)) {
      const signInUrl = new URL(session.signInPath, request.url);
      const response = NextResponse.redirect(signInUrl);

      response.cookies.set(session.access, "", cookieOptions(0));
      response.cookies.set(session.refresh, "", cookieOptions(0));

      return response;
    }

    return clearSessionCookies(request, session);
  }
}

export async function middleware(request: NextRequest) {
  const hasCustomerSession =
    request.cookies.has(userAccessCookie) || request.cookies.has(userRefreshCookie);
  const hasAdminSession =
    request.cookies.has(adminAccessCookie) || request.cookies.has(adminRefreshCookie);

  if (hasCustomerSession) {
    return await refreshSession(request, customerCookies) ?? responseWithRequestCookies(request);
  }

  if (hasAdminSession) {
    return await refreshSession(request, adminCookies) ?? responseWithRequestCookies(request);
  }

  return responseWithRequestCookies(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png).*)"],
  runtime: "nodejs"
};
