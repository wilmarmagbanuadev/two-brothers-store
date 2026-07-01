"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, Menu, User, X } from "lucide-react";

import { CartLink } from "@/components/cart-link";
import { ProductSearch } from "@/components/product-search";
import { Button } from "@/components/ui/button";
import type { DirectusRoleName } from "@/lib/current-user";
import type { Category } from "@/lib/directus";

const navItems = [
  { href: "/products", label: "Products" }
];

type SiteHeaderProps = {
  categories: Category[];
  currentRole: DirectusRoleName | null;
};

export function SiteHeader({ categories, currentRole }: SiteHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isCustomer = currentRole === "Customer";
  const isAdmin = currentRole === "Admin" || currentRole === "Administrator";

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
        <div className="flex min-w-0 items-center">
          <Link
            href="/"
            className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background shadow-md md:-mb-7 md:mr-8 md:h-24 md:w-24"
            onClick={closeMobileMenu}
            aria-label="Two Brothers Store home"
          >
            <Image
              src="/circle_logo_no_border.png"
              alt="Two Brothers Store logo"
              width={128}
              height={128}
              className="h-full w-full object-contain"
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
                      key={category.slug}
                      href={`/products?category=${encodeURIComponent(category.slug)}`}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:flex-none">
          <ProductSearch categories={categories} className="flex shrink-0" />
          {isCustomer ? <CartLink /> : null}
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href={isCustomer ? "/dashboard/user" : isAdmin ? "/dashboard/admin" : "/sign-in/user"}>
              <User className="h-4 w-4" />
              {isCustomer || isAdmin ? "Dashboard" : "Sign In"}
            </Link>
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
                    key={category.slug}
                    href={`/products?category=${encodeURIComponent(category.slug)}`}
                    onClick={closeMobileMenu}
                    className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-2 border-t pt-5">
              <Button asChild variant="outline">
                <Link href={isCustomer ? "/dashboard/user" : isAdmin ? "/dashboard/admin" : "/sign-in/user"} onClick={closeMobileMenu}>
                  <User className="h-4 w-4" />
                  {isCustomer || isAdmin ? "Dashboard" : "Sign In"}
                </Link>
              </Button>
              {!isAdmin ? (
                <Button asChild variant="outline">
                  <Link href="/sign-in/admin" onClick={closeMobileMenu}>
                    Admin Sign In
                  </Link>
                </Button>
              ) : null}
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
