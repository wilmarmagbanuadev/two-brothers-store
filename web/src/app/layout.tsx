import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

import { CartProvider } from "@/components/cart-provider";
import { MaintenancePage } from "@/components/maintenance-page";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentDirectusRole } from "@/lib/current-user";
import { getCategoriesState } from "@/lib/directus";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Two Brothers Store",
  description: "Modern storefront scaffold for Two Brothers Store",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get("x-two-brothers-pathname") ?? "";
  const isAdminPath =
    pathname === "/sign-in/admin" ||
    pathname === "/dashboard/admin" ||
    pathname.startsWith("/dashboard/admin/");
  const [categoryState, currentRole] = await Promise.all([
    isAdminPath ? Promise.resolve({ data: [], offline: false }) : getCategoriesState(),
    getCurrentDirectusRole()
  ]);
  const categories = categoryState.data;

  if (!isAdminPath && categoryState.offline) {
    return (
      <html lang="en">
        <body>
          <MaintenancePage />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteHeader categories={categories} currentRole={currentRole} />
          {children}
          <SiteFooter categories={categories} />
        </CartProvider>
      </body>
    </html>
  );
}
