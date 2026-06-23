import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { categories } from "@/lib/products";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src="/two-brothers-logo.png"
              alt="Two Brothers Store logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-md object-contain"
            />
            <span>Two Brothers Store</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Everyday groceries, pantry staples, home goods, and fresh essentials prepared for quick local shopping.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Shop</h2>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/products" className="hover:text-foreground">All Products</Link>
            {categories.slice(0, 4).map((category) => (
              <Link key={category} href={`/products?category=${encodeURIComponent(category)}`} className="hover:text-foreground">
                {category}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Company</h2>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground">About Us</Link>
            <Link href="/dashboard/user" className="hover:text-foreground">My Dashboard</Link>
            <Link href="/sign-in/user" className="hover:text-foreground">User Sign In</Link>
            <Link href="/sign-in/admin" className="hover:text-foreground">Admin Sign In</Link>
            <Link href="/sign-up" className="hover:text-foreground">Create Account</Link>
            <Link href="/cart" className="hover:text-foreground">Cart</Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Contact</h2>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <span className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4" /> Hda. Caway-way, Brgy. Talotog, Murcia, Negros Occidental</span>
            <span className="flex gap-2"><Phone className="mt-0.5 h-4 w-4" /> +63 900 000 0000</span>
            <span className="flex gap-2"><Mail className="mt-0.5 h-4 w-4" /> hello@twobrothers.store</span>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Two Brothers Store. All rights reserved.</p>
          <p>Fresh essentials, ready for everyday orders.</p>
        </div>
      </div>
    </footer>
  );
}
