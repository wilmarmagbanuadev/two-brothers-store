import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold tracking-normal">Page not found</h1>
      <p className="mt-3 text-muted-foreground">The page or product you opened does not exist.</p>
      <Button asChild className="mt-6">
        <Link href="/products">Go to products</Link>
      </Button>
    </main>
  );
}
