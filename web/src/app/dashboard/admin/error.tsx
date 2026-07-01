"use client";

import { RefreshCw } from "lucide-react";

import { DirectusConnectionStatus } from "@/components/directus-connection-status";
import { Button } from "@/components/ui/button";

export default function AdminDashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="py-10">
      <DirectusConnectionStatus initialState="offline" className="mb-4 max-w-md" />
      <h1 className="text-2xl font-bold tracking-normal">Store data is offline</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Saved products, customers, and queued transactions remain available where offline data has been prepared.
      </p>
      <Button type="button" variant="outline" className="mt-5" onClick={reset}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </main>
  );
}
