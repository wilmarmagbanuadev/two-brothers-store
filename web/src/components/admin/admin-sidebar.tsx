"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  HandCoins,
  Home,
  Package,
  Settings,
  Store,
  Users,
  X
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AdminPwa } from "@/components/admin/admin-pwa";
import { DirectusConnectionStatus } from "@/components/directus-connection-status";
import { Button } from "@/components/ui/button";
import { openAdminNavigationEvent } from "@/lib/admin-navigation";

const mainItems = [
  { label: "Overview", href: "/dashboard/admin", icon: Home },
  { label: "Orders", href: "/dashboard/admin/orders", icon: ClipboardList },
  { label: "Utang", href: "/dashboard/admin/utang", icon: HandCoins },
  { label: "Products", href: "/dashboard/admin/products", icon: Package },
  { label: "Customers", href: "/dashboard/admin/customers", icon: Users }
];

const mobileItems = [
  ...mainItems,
  { label: "Settings", href: "/dashboard/admin/settings", icon: Settings }
];

function isActiveRoute(pathname: string, href: string) {
  return href === "/dashboard/admin" ? pathname === href : pathname.startsWith(href);
}

function AdminNavLinks({
  items,
  pathname,
  onNavigate
}: {
  items: typeof mobileItems;
  pathname: string;
  onNavigate?: () => void;
}) {
  return items.map((item) => {
    const Icon = item.icon;
    const isActive = isActiveRoute(pathname, item.href);

    return (
      <a
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${
          isActive
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </a>
    );
  });
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const openNavigation = () => setIsMobileOpen(true);

    window.addEventListener(openAdminNavigationEvent, openNavigation);

    return () => window.removeEventListener(openAdminNavigationEvent, openNavigation);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen]);

  return (
    <>
      {isMobileOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close admin menu"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside
            id="mobile-admin-menu"
            aria-label="Admin navigation"
            className="relative flex h-full w-[min(320px,88vw)] flex-col border-r bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-4">
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  <Store className="h-5 w-5 text-primary" />
                  Admin CMS
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Store operations</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close admin menu"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="grid flex-1 content-start gap-1 overflow-y-auto px-3 py-4">
              <AdminNavLinks
                items={mobileItems}
                pathname={pathname}
                onNavigate={() => setIsMobileOpen(false)}
              />
            </nav>

            <div className="border-t p-3">
              <LogoutButton redirectTo="/sign-in/admin" />
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="hidden w-60 shrink-0 py-10 lg:block">
        <div className="sticky top-24 rounded-lg border bg-background p-3 shadow-sm">
          <div className="flex items-center gap-2 px-2 py-2 font-semibold">
            <Store className="h-5 w-5 text-primary" />
            Admin CMS
          </div>
          <p className="px-2 text-xs text-muted-foreground">Store operations</p>
          <DirectusConnectionStatus className="mt-3" />

          <nav className="mt-5 grid gap-1 text-sm">
            <AdminNavLinks items={mainItems} pathname={pathname} />
          </nav>

          <div className="mt-8 border-t pt-3">
            <AdminPwa />
            <a
              href="/dashboard/admin/settings"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                isActiveRoute(pathname, "/dashboard/admin/settings")
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </a>
            <LogoutButton redirectTo="/sign-in/admin" />
          </div>
        </div>
      </aside>
    </>
  );
}
