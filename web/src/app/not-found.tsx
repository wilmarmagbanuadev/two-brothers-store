import Image from "next/image";
import Link from "next/link";
import { Home, SearchX, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            <SearchX className="h-5 w-5" />
            Page not found
          </div>
          <p className="mt-5 text-7xl font-bold leading-none text-primary sm:text-8xl">404</p>
          <h1 className="mt-6 text-3xl font-bold tracking-normal sm:text-4xl">
            This page is not on our shelf
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            The link may be outdated, or the page may have moved. Return to the store or continue browsing available products.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="h-4 w-4" />
                Back Home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/products">
                <ShoppingBag className="h-4 w-4" />
                Browse Products
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center border-l-0 pt-4 lg:border-l lg:pl-10">
          <Image
            src="/circle_logo_no_border.png"
            alt="Two Brothers Store"
            width={360}
            height={360}
            priority
            className="h-auto w-full max-w-72 object-contain sm:max-w-80"
          />
        </div>
      </div>
    </main>
  );
}
