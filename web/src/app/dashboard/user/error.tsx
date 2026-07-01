"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function CustomerDashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="py-10">
      <h1 className="text-2xl font-bold tracking-normal">Customer data is offline</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Your account data cannot be refreshed until the store service reconnects.
      </p>
      <Button type="button" variant="outline" className="mt-5" onClick={reset}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </main>
  );
}
