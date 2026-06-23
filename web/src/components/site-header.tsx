"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, Menu, User, X } from "lucide-react";

import { CartLink } from "@/components/cart-link";
import { ProductSearch } from "@/components/product-search";
import { Button } from "@/components/ui/button";
import { categories } from "@/lib/products";

const navItems = [
  { href: "/products", label: "Products" },
  { href: "/about", label: "About Us" }
];

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-4 flex shrink-0 items-center md:mr-8" onClick={closeMobileMenu}>
          <Image
            src="/two-brothers-logo.png"
            alt="Two Brothers Store logo"
            width={56}
            height={56}
            className="h-12 w-12 rounded-md object-contain sm:h-14 sm:w-14"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <div className="group relative">
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              Categories
              <ChevronDown className="h-4 w-4 group-hover:hidden" />
              <ChevronUp className="hidden h-4 w-4 group-hover:block" />
            </button>
            <div className="invisible absolute right-0 top-full w-56 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="rounded-lg border bg-card p-2 shadow-lg">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/products?category=${encodeURIComponent(category)}`}
                    className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <ProductSearch />
          <CartLink />
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/sign-in/user">
              <User className="h-4 w-4" />
              Sign In
            </Link>
          </Button>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/sign-up">Sign Up</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="border-t bg-background md:hidden">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6">
            <nav className="grid gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div>
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Categories</p>
              <div className="mt-2 grid gap-1">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/products?category=${encodeURIComponent(category)}`}
                    onClick={closeMobileMenu}
                    className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-2 border-t pt-5">
              <Button asChild variant="outline">
                <Link href="/sign-in/user" onClick={closeMobileMenu}>
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sign-in/admin" onClick={closeMobileMenu}>
                  Admin Sign In
                </Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up" onClick={closeMobileMenu}>Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
