"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  HandCoins,
  Home,
  ReceiptText,
  Settings,
  ShoppingBag,
  User,
  WalletCards
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";

const mainItems = [
  { label: "Overview", href: "/dashboard/user", icon: Home },
  { label: "Transactions", href: "/dashboard/user/transactions", icon: ReceiptText },
  { label: "Utang", href: "/dashboard/user/utang", icon: HandCoins },
  { label: "Loans", href: "/dashboard/user/loans", icon: WalletCards },
  { label: "Payments", href: "/dashboard/user/payments", icon: CreditCard },
  { label: "Profile", href: "/dashboard/user/profile", icon: User }
];

export function CustomerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 py-10 lg:block">
      <div className="sticky top-24 rounded-lg border bg-background p-3 shadow-sm">
        <div className="flex items-center gap-2 px-2 py-2 font-semibold">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Customer
        </div>
        <p className="px-2 text-xs text-muted-foreground">Account menu</p>

        <nav className="mt-5 grid gap-1 text-sm">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard/user" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 ${
                  isActive ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t pt-3">
          <Link
            href="/dashboard/user/settings"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              pathname.startsWith("/dashboard/user/settings")
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <LogoutButton redirectTo="/sign-in/user" />
        </div>
      </div>
    </aside>
  );
}
