"use client";

import { ReactNode, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { isOfflineAdminAuthenticated } from "@/lib/admin-offline-auth";

type OfflineAdminGuardProps = {
  children: ReactNode;
  required: boolean;
};

export function OfflineAdminGuard({ children, required }: OfflineAdminGuardProps) {
  const [isAllowed, setIsAllowed] = useState(!required);

  useEffect(() => {
    if (!required) {
      setIsAllowed(true);
      return;
    }

    let isCancelled = false;

    void isOfflineAdminAuthenticated().then((authenticated) => {
      if (isCancelled) {
        return;
      }

      if (authenticated) {
        setIsAllowed(true);
      } else {
        window.location.replace("/sign-in/admin");
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [required]);

  if (!isAllowed) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Checking admin access
        </div>
      </main>
    );
  }

  return children;
}
