"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { loadAdminOrderCatalog } from "@/app/dashboard/admin/orders/actions";
import { checkStoreServiceConnection } from "@/app/connection-actions";
import { Button } from "@/components/ui/button";
import { adminOrderCatalogSnapshotKey, saveAdminSnapshot } from "@/lib/admin-offline";
import { setOfflineAdminAuthenticated } from "@/lib/admin-offline-auth";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const adminRoutes = [
  "/sign-in/admin",
  "/dashboard/admin",
  "/dashboard/admin/orders",
  "/dashboard/admin/utang",
  "/dashboard/admin/products",
  "/dashboard/admin/customers",
  "/dashboard/admin/settings"
];

function waitForActiveWorker(registration: ServiceWorkerRegistration) {
  if (registration.active) {
    return Promise.resolve();
  }

  const worker = registration.installing ?? registration.waiting;

  if (!worker) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const handleStateChange = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        worker.removeEventListener("statechange", handleStateChange);
        resolve();
      }
    };

    worker.addEventListener("statechange", handleStateChange);
    handleStateChange();
  });
}

async function warmAdminCache() {
  const assets = new Set<string>();

  for (const route of adminRoutes) {
    try {
      const response = await fetch(route, {
        cache: "reload",
        credentials: "include",
        headers: {
          "x-admin-pwa-warmup": "1"
        }
      });

      if (!response.ok || response.redirected) {
        continue;
      }

      const document = new DOMParser().parseFromString(await response.text(), "text/html");

      document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((element) => {
        const url = new URL(element.src, window.location.origin);

        if (url.origin === window.location.origin && url.pathname.startsWith("/_next/static/")) {
          assets.add(url.toString());
        }
      });

      document.querySelectorAll<HTMLLinkElement>("link[href]").forEach((element) => {
        const url = new URL(element.href, window.location.origin);

        if (url.origin === window.location.origin && url.pathname.startsWith("/_next/static/")) {
          assets.add(url.toString());
        }
      });
    } catch {
      break;
    }
  }

  await Promise.allSettled(
    Array.from(assets, (asset) =>
      fetch(asset, {
        cache: "reload",
        credentials: "include"
      })
    )
  );

  try {
    if (!(await checkStoreServiceConnection())) {
      return;
    }

    const catalog = await loadAdminOrderCatalog();
    await saveAdminSnapshot(adminOrderCatalogSnapshotKey, catalog);
  } catch {
    // Keep the last complete catalog when Directus is temporarily unavailable.
  }
}

export function AdminPwa() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let hasWarmedCache = false;
    let updateTimer: number | undefined;

    const warmOnce = () => {
      if (isCancelled || hasWarmedCache || !navigator.serviceWorker.controller || !navigator.onLine) {
        return;
      }

      hasWarmedCache = true;
      void warmAdminCache();
    };

    const handleControllerChange = () => {
      if (navigator.onLine) {
        window.location.reload();
        return;
      }

      hasWarmedCache = false;
      warmOnce();
    };

    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker
        .register("/admin-sw.js", {
          scope: "/",
          updateViaCache: "none"
        })
        .then(async (registration) => {
          await waitForActiveWorker(registration);
          updateTimer = window.setInterval(() => {
            void registration.update();
          }, 5 * 60 * 1000);
          const registrations = await navigator.serviceWorker.getRegistrations();

          await Promise.all(
            registrations
              .filter((registration) => new URL(registration.scope).pathname === "/dashboard/admin/")
              .map((registration) => registration.unregister())
          );
          await setOfflineAdminAuthenticated(true);
          warmOnce();
        });

      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    }

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    function handleInstalled() {
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      isCancelled = true;
      if (updateTimer !== undefined) {
        window.clearInterval(updateTimer);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!installPrompt) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mb-2 w-full justify-start"
      onClick={async () => {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      }}
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}
