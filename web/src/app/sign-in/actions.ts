"use server";

import { cookies } from "next/headers";

import {
  adminAccessCookie,
  adminRefreshCookie,
  cookieOptions,
  encryptSessionValue,
  userAccessCookie,
  userRefreshCookie
} from "@/lib/admin-session";
import { roleNameFromAccessToken } from "@/lib/directus-role";

const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const sessionCookies = [adminAccessCookie, adminRefreshCookie, userAccessCookie, userRefreshCookie];

type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "role" | "unavailable" | "validation" | "unknown";
      error: string;
    };

function friendlyLoginError(status: number): LoginResult {
  if (status === 401 || status === 403) {
    return {
      ok: false,
      reason: "invalid",
      error: "The email or password is incorrect."
    };
  }

  if (status === 400) {
    return {
      ok: false,
      reason: "validation",
      error: "Please enter your email and password."
    };
  }

  return {
    ok: false,
    reason: "unknown",
    error: "Unable to log in right now. Please try again."
  };
}

async function loginWithRole(payload: LoginPayload, roleName: "Admin" | "Customer"): Promise<LoginResult> {
  const email = payload.email?.trim() ?? "";
  const password = payload.password ?? "";

  if (!email || !password) {
    return {
      ok: false,
      reason: "validation",
      error: "Please enter your email and password."
    };
  }

  let response: Response;

  try {
    response = await fetch(`${directusUrl.replace(/\/$/, "")}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        mode: "json"
      })
    });
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      error: "The store service is unavailable. Use offline login on an enrolled device."
    };
  }

  let data;

  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      error: "The store service returned an invalid response. Please try again."
    };
  }

  if (!response.ok) {
    return friendlyLoginError(response.status);
  }

  let actualRoleName;

  try {
    actualRoleName = await roleNameFromAccessToken(data.data.access_token);
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      error: "The store service is unavailable. Use offline login on an enrolled device."
    };
  }

  if (actualRoleName !== roleName) {
    return {
      ok: false,
      reason: "role",
      error: roleName === "Admin"
        ? "Please use an admin account to log in here."
        : "Please use a customer account to log in here."
    };
  }

  const cookieStore = await cookies();
  const maxAgeSeconds = Math.max(60, Math.floor(Number(data.data.expires ?? 0) / 1000));
  const accessCookie = roleName === "Admin" ? adminAccessCookie : userAccessCookie;
  const refreshCookie = roleName === "Admin" ? adminRefreshCookie : userRefreshCookie;

  sessionCookies.forEach((cookieName) => {
    cookieStore.set(cookieName, "", cookieOptions(0));
  });
  cookieStore.set(accessCookie, encryptSessionValue(data.data.access_token), cookieOptions(maxAgeSeconds));
  cookieStore.set(refreshCookie, encryptSessionValue(data.data.refresh_token), cookieOptions(60 * 60 * 24 * 30));

  return { ok: true };
}

export async function loginAdmin(payload: LoginPayload) {
  return loginWithRole(payload, "Admin");
}

export async function loginCustomer(payload: LoginPayload) {
  return loginWithRole(payload, "Customer");
}

export async function logoutSession() {
  const cookieStore = await cookies();

  sessionCookies.forEach((cookieName) => {
    cookieStore.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
  });

  return { ok: true };
}
