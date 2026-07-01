"use client";

import { useEffect } from "react";
import Image from "next/image";
import { RefreshCw, Store } from "lucide-react";

import { checkStoreServiceConnection } from "@/app/connection-actions";
import { Button } from "@/components/ui/button";

export function MaintenancePage() {
  useEffect(() => {
    let isCancelled = false;

    const checkConnection = async () => {
      if (!navigator.onLine) {
        return;
      }

      try {
        const isOnline = await checkStoreServiceConnection();

        if (isOnline && !isCancelled) {
          window.location.reload();
        }
      } catch {
        // Stay on maintenance while the store service is unavailable.
      }
    };
    const timer = window.setInterval(() => void checkConnection(), 15_000);
    const handleOnline = () => void checkConnection();

    window.addEventListener("online", handleOnline);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-xl text-center">
        <Image
          src="/circle_logo_no_border.png"
          alt="Two Brothers Store"
          width={112}
          height={112}
          priority
          className="mx-auto h-28 w-28 object-contain"
        />
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          <Store className="h-4 w-4" />
          Two Brothers Store
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-normal sm:text-4xl">Store maintenance</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          The storefront is temporarily unavailable while the store service is offline. This page will reconnect automatically.
        </p>
        <div className="mt-6 flex justify-center">
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Check Again
          </Button>
        </div>
      </div>
    </main>
  );
}
