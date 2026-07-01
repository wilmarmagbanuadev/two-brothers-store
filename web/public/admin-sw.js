importScripts("/admin-sw-version.js");

const DEPLOYMENT_VERSION = self.__TWO_BROTHERS_ADMIN_BUILD__ || "development";
const WORKER_PROTOCOL_VERSION = 10;
const CACHE_NAME = `two-brothers-admin-shell-${DEPLOYMENT_VERSION}`;
const RUNTIME_CACHE = `two-brothers-admin-runtime-${DEPLOYMENT_VERSION}`;
const AUTH_CACHE_NAME = "two-brothers-admin-auth";
const PRODUCT_IMAGE_CACHE = "two-brothers-product-images";
const OFFLINE_URL = "/admin-offline.html";
const OFFLINE_AUTH_URL = "/__two_brothers_admin_offline_auth__";
const OFFLINE_AUTH_DURATION = 8 * 60 * 60 * 1000;
const SHELL_ASSETS = [
  OFFLINE_URL,
  "/admin-manifest.webmanifest",
  "/circle_logo_no_border.png",
  "/favicon.png"
];

async function fetchWithTimeout(request, timeout = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function setOfflineAuthenticated(authenticated) {
  const cache = await caches.open(AUTH_CACHE_NAME);

  if (!authenticated) {
    await cache.delete(OFFLINE_AUTH_URL);
    return;
  }

  await cache.put(
    OFFLINE_AUTH_URL,
    new Response(String(Date.now() + OFFLINE_AUTH_DURATION), {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store"
      }
    })
  );
}

async function isOfflineAuthenticated() {
  const cache = await caches.open(AUTH_CACHE_NAME);
  const response = await cache.match(OFFLINE_AUTH_URL);

  if (!response) {
    return false;
  }

  const expiresAt = Number(await response.text());

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await cache.delete(OFFLINE_AUTH_URL);
    return false;
  }

  return true;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const previousRuntimeKeys = keys.filter((key) =>
        key !== RUNTIME_CACHE &&
        (key === "two-brothers-admin-runtime" || key.startsWith("two-brothers-admin-runtime-"))
      );

      await Promise.all(
        keys
          .filter(
            (key) =>
              (key.startsWith("two-brothers-admin-shell-") && key !== CACHE_NAME) ||
              previousRuntimeKeys.includes(key)
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_ADMIN_OFFLINE_AUTH") {
    event.waitUntil(
      setOfflineAuthenticated(true).then(() => {
        event.ports[0]?.postMessage({
          authenticated: true,
          version: WORKER_PROTOCOL_VERSION,
          deployment: DEPLOYMENT_VERSION
        });
      })
    );
    return;
  }

  if (event.data?.type === "CLEAR_ADMIN_OFFLINE_AUTH") {
    event.waitUntil(
      setOfflineAuthenticated(false).then(() => {
        event.ports[0]?.postMessage({
          authenticated: false,
          version: WORKER_PROTOCOL_VERSION,
          deployment: DEPLOYMENT_VERSION
        });
      })
    );
    return;
  }

  if (event.data?.type !== "CLEAR_ADMIN_RUNTIME_CACHE") {
    return;
  }

  event.waitUntil(
    caches.delete(RUNTIME_CACHE).then(() => {
      event.ports[0]?.postMessage({ cleared: true });
    })
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.destination === "image" && (url.protocol === "http:" || url.protocol === "https:")) {
    event.respondWith(
      caches.open(PRODUCT_IMAGE_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);

          if (response.ok || response.type === "opaque") {
            await cache.put(request, response.clone());
          }

          return response;
        } catch {
          return (await cache.match(request))
            || new Response("", {
              status: 503,
              statusText: "Image unavailable offline"
            });
        }
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        if (cached) {
          return cached;
        }

        try {
          const response = await fetchWithTimeout(request);

          if (response.ok) {
            await cache.put(request, response.clone());
          }

          return response;
        } catch {
          return (await cache.match(request))
            || new Response("Admin asset is unavailable offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" }
            });
        }
      })
    );
    return;
  }

  if (url.pathname === "/sign-in/admin") {
    const isRscRequest = request.headers.get("rsc") === "1" || url.searchParams.has("_rsc");

    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        try {
          const response = await fetchWithTimeout(request);

          if (response.ok && !response.redirected && !isRscRequest) {
            await cache.put("/sign-in/admin", response.clone());
          }

          return response;
        } catch {
          if (request.mode === "navigate" && !isRscRequest) {
            return (await cache.match("/sign-in/admin", { ignoreVary: true }))
              || (await caches.match(OFFLINE_URL));
          }

          return new Response("Admin sign-in is unavailable.", {
            status: 503,
            headers: { "Content-Type": "text/plain" }
          });
        }
      })
    );
    return;
  }

  if (!url.pathname.startsWith("/dashboard/admin")) {
    return;
  }

  const cacheUrl = new URL(request.url);
  const isRscRequest = request.headers.get("rsc") === "1" || cacheUrl.searchParams.has("_rsc");
  cacheUrl.searchParams.delete("_rsc");

  if (isRscRequest) {
    cacheUrl.searchParams.set("__offline_rsc", "1");
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      try {
        const response = await fetchWithTimeout(request);

        if (response.ok && !response.redirected) {
          await cache.put(cacheUrl.toString(), response.clone());
          await setOfflineAuthenticated(true);
          return response;
        }

        const canUseOfflineCache = response.redirected && await isOfflineAuthenticated();

        if (canUseOfflineCache) {
          const cachedAfterRedirect = await cache.match(cacheUrl.toString(), { ignoreVary: true });

          if (cachedAfterRedirect) {
            return cachedAfterRedirect;
          }
        }

        if (response.status < 500 && !canUseOfflineCache) {
          return response;
        }
      } catch {
        // Fall through to the last successful admin response.
      }

      if (!(await isOfflineAuthenticated())) {
        return Response.redirect(new URL("/sign-in/admin", self.location.origin), 302);
      }

      const cached = await cache.match(cacheUrl.toString(), { ignoreVary: true });

      if (cached) {
        return cached;
      }

      if (request.mode === "navigate") {
        return (await cache.match("/dashboard/admin", { ignoreVary: true }))
          || (await caches.match(OFFLINE_URL));
      }

      return new Response("Admin data is unavailable offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain" }
      });
    })
  );
});
