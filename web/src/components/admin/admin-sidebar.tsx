"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  HandCoins,
  Home,
  Package,
  Settings,
  Store,
  Users
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminPwa } from "@/components/admin/admin-pwa";
import { DirectusConnectionStatus } from "@/components/directus-connection-status";

const mainItems = [
  { label: "Overview", href: "/dashboard/admin", icon: Home },
  { label: "Orders", href: "/dashboard/admin/orders", icon: ClipboardList },
  { label: "Utang", href: "/dashboard/admin/utang", icon: HandCoins },
  { label: "Products", href: "/dashboard/admin/products", icon: Package },
  { label: "Customers", href: "/dashboard/admin/customers", icon: Users }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 py-10 lg:block">
      <div className="sticky top-24 rounded-lg border bg-background p-3 shadow-sm">
        <div className="flex items-center gap-2 px-2 py-2 font-semibold">
          <Store className="h-5 w-5 text-primary" />
          Admin CMS
        </div>
        <p className="px-2 text-xs text-muted-foreground">Store operations</p>
        <DirectusConnectionStatus className="mt-3" />

        <nav className="mt-5 grid gap-1 text-sm">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard/admin" ? pathname === item.href : pathname.startsWith(item.href);

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
          <AdminPwa />
          <Link
            href="/dashboard/admin/settings"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              pathname.startsWith("/dashboard/admin/settings")
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <LogoutButton redirectTo="/sign-in/admin" />
        </div>
      </div>
    </aside>
  );
}
