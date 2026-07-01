import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";

import { AdminOfflineSync } from "@/components/admin/admin-offline-sync";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { OfflineAdminGuard } from "@/components/admin/offline-admin-guard";
import { DirectusConnectionStatus } from "@/components/directus-connection-status";
import { getCurrentDirectusRole } from "@/lib/current-user";
import { getCategoriesState } from "@/lib/directus";

export const metadata: Metadata = {
  applicationName: "Two Brothers Store Admin",
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TB Admin",
    statusBarStyle: "default"
  },
  robots: {
    index: false,
    follow: false
  }
};

export const viewport: Viewport = {
  themeColor: "#185d48"
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [currentRole, directusState] = await Promise.all([
    getCurrentDirectusRole(),
    getCategoriesState()
  ]);
  const hasAdminSession = currentRole === "Admin" || currentRole === "Administrator";

  if (!hasAdminSession && !directusState.offline) {
    redirect("/sign-in/admin");
  }

  return (
    <OfflineAdminGuard required={!hasAdminSession}>
      <>
        <div className="mx-auto flex max-w-[1500px] gap-6 px-4 sm:px-6 lg:px-8">
          <AdminSidebar />
          <div className="min-w-0 flex-1">
            <DirectusConnectionStatus offlineOnly className="mt-4 lg:hidden" />
            {children}
          </div>
        </div>
        <AdminOfflineSync />
      </>
    </OfflineAdminGuard>
  );
}
