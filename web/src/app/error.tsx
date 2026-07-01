"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function StorefrontError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-normal">Store is offline</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Products and account information cannot be refreshed until the store service reconnects.
      </p>
      <Button type="button" variant="outline" className="mt-5" onClick={reset}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </main>
  );
}
