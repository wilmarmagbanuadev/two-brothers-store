const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const refreshResultTtlMs = 15_000;

export type DirectusRefreshResult = {
  accessToken: string;
  refreshToken: string;
  expires: number;
};

export class DirectusRefreshError extends Error {
  constructor(public reason: "invalid" | "unavailable") {
    super(reason === "invalid" ? "DIRECTUS_REFRESH_INVALID" : "DIRECTUS_REFRESH_UNAVAILABLE");
  }
}

type RefreshCache = Map<string, Promise<DirectusRefreshResult>>;

const globalRefreshState = globalThis as typeof globalThis & {
  directusRefreshCache?: RefreshCache;
};

const refreshCache = globalRefreshState.directusRefreshCache ?? new Map();
globalRefreshState.directusRefreshCache = refreshCache;

async function requestFreshTokens(refreshToken: string): Promise<DirectusRefreshResult> {
  let response: Response;

  try {
    response = await fetch(`${directusUrl.replace(/\/$/, "")}/auth/refresh`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        mode: "json"
      })
    });
  } catch {
    throw new DirectusRefreshError("unavailable");
  }
  const data = await response.json();

  if (!response.ok) {
    throw new DirectusRefreshError(
      response.status === 400 || response.status === 401 || response.status === 403
        ? "invalid"
        : "unavailable"
    );
  }

  return {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    expires: Number(data.data.expires ?? 0)
  };
}

export function refreshDirectusSession(refreshToken: string) {
  const existingRefresh = refreshCache.get(refreshToken);

  if (existingRefresh) {
    return existingRefresh;
  }

  const refresh = requestFreshTokens(refreshToken);
  refreshCache.set(refreshToken, refresh);

  void refresh.then(
    () => {
      setTimeout(() => {
        if (refreshCache.get(refreshToken) === refresh) {
          refreshCache.delete(refreshToken);
        }
      }, refreshResultTtlMs);
    },
    () => {
      if (refreshCache.get(refreshToken) === refresh) {
        refreshCache.delete(refreshToken);
      }
    }
  );

  return refresh;
}
