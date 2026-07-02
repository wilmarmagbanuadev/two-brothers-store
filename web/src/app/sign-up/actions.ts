"use server";

const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const directusStaticToken = process.env.DIRECTUS_STATIC_TOKEN;
const directusAdminEmail = process.env.DIRECTUS_ADMIN_EMAIL;
const directusAdminPassword = process.env.DIRECTUS_ADMIN_PASSWORD;

type SignUpPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type SignUpResult =
  | { ok: true }
  | {
      ok: false;
      reason: "validation" | "duplicate" | "unavailable" | "configuration" | "unknown";
      error: string;
    };

type DirectusListResponse<T> = {
  data: T[];
};

type DirectusLoginResponse = {
  data?: {
    access_token?: string;
  };
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function privilegedToken() {
  if (directusStaticToken) {
    return directusStaticToken;
  }

  if (!directusAdminEmail || !directusAdminPassword) {
    return null;
  }

  const response = await fetch(`${directusUrl.replace(/\/$/, "")}/auth/login`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: directusAdminEmail,
      password: directusAdminPassword,
      mode: "json"
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as DirectusLoginResponse;

  return data.data?.access_token ?? null;
}

async function directusRequest<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${directusUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers
    }
  });

  let data: T | null = null;

  try {
    data = (await response.json()) as T;
  } catch {
    // Some successful Directus operations do not return a response body.
  }

  return { response, data };
}

export async function signUpCustomer(payload: SignUpPayload): Promise<SignUpResult> {
  const firstName = payload.firstName?.trim() ?? "";
  const lastName = payload.lastName?.trim() ?? "";
  const email = normalizeEmail(payload.email ?? "");
  const password = payload.password ?? "";

  if (!firstName || !lastName) {
    return {
      ok: false,
      reason: "validation",
      error: "Please enter your first name and last name."
    };
  }

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      reason: "validation",
      error: "Please enter a valid email address."
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      reason: "validation",
      error: "Your password must contain at least 8 characters."
    };
  }

  let token: string | null;

  try {
    token = await privilegedToken();
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      error: "Account registration is temporarily unavailable. Please try again later."
    };
  }

  if (!token) {
    return {
      ok: false,
      reason: "configuration",
      error: "Account registration is not configured yet. Please contact the store."
    };
  }

  try {
    const roleQuery = new URLSearchParams({
      fields: "id",
      "filter[name][_eq]": "Customer",
      limit: "1"
    });
    const roleResult = await directusRequest<DirectusListResponse<{ id: string }>>(
      `/roles?${roleQuery.toString()}`,
      token
    );
    const roleId = roleResult.data?.data[0]?.id;

    if (!roleResult.response.ok || !roleId) {
      return {
        ok: false,
        reason: "configuration",
        error: "Customer registration is not configured yet. Please contact the store."
      };
    }

    const userQuery = new URLSearchParams({
      fields: "id",
      "filter[email][_eq]": email,
      limit: "1"
    });
    const existing = await directusRequest<DirectusListResponse<{ id: string }>>(
      `/users?${userQuery.toString()}`,
      token
    );

    if (existing.response.ok && existing.data?.data.length) {
      return {
        ok: false,
        reason: "duplicate",
        error: "An account with this email address already exists."
      };
    }

    const created = await directusRequest(
      "/users",
      token,
      {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          role: roleId,
          status: "draft"
        })
      }
    );

    if (created.response.ok) {
      return { ok: true };
    }

    if (created.response.status === 400) {
      return {
        ok: false,
        reason: "duplicate",
        error: "This email address is already registered or the account details are invalid."
      };
    }

    return {
      ok: false,
      reason: "unknown",
      error: "Unable to create your account right now. Please try again."
    };
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      error: "Account registration is temporarily unavailable. Please try again later."
    };
  }
}
