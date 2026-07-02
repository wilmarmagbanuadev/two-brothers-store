import "server-only";

const directusUrl = (
  process.env.DIRECTUS_INTERNAL_URL
  ?? process.env.DIRECTUS_URL
  ?? process.env.NEXT_PUBLIC_DIRECTUS_URL
  ?? "http://localhost:8055"
).replace(/\/$/, "");

type DirectusLoginResponse = {
  data?: {
    access_token?: string;
  };
};

async function directusSystemToken() {
  if (process.env.DIRECTUS_STATIC_TOKEN) {
    return process.env.DIRECTUS_STATIC_TOKEN;
  }

  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  const response = await fetch(`${directusUrl}/auth/login`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as DirectusLoginResponse;
  return data.data?.access_token ?? null;
}

export async function directusSystemRequest<T>(path: string) {
  const accessToken = await directusSystemToken();

  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${directusUrl}${path}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    return null;
  }

  return await response.json() as T;
}
