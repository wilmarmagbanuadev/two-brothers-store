"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { logoutSession } from "@/app/sign-in/actions";
import { checkStoreServiceConnection } from "@/app/connection-actions";
import { setOfflineAdminAuthenticated } from "@/lib/admin-offline-auth";

type LogoutButtonProps = {
  redirectTo?: string;
};

export function LogoutButton({ redirectTo = "/" }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      if (redirectTo === "/sign-in/admin") {
        let isStoreOnline = false;

        try {
          isStoreOnline = navigator.onLine && await checkStoreServiceConnection();
        } catch {
          isStoreOnline = false;
        }

        if (isStoreOnline) {
          await logoutSession();
        }
      } else {
        await logoutSession();
      }
    } finally {
      if (redirectTo === "/sign-in/admin") {
        await setOfflineAdminAuthenticated(false);
        window.location.assign(redirectTo);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? "Logging out..." : "Logout"}
    </button>
  );
}
