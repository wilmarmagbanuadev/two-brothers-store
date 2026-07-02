"use client";

import { ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function SuspendedAccountModal() {
  const router = useRouter();

  function closeModal() {
    router.replace("/sign-in/user");
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspended-account-title"
      aria-describedby="suspended-account-description"
    >
      <div className="relative w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <button
          type="button"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={closeModal}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 id="suspended-account-title" className="mt-5 pr-10 text-xl font-semibold">
          Account Suspended
        </h2>
        <p id="suspended-account-description" className="mt-2 text-sm leading-6 text-muted-foreground">
          Your customer account has been suspended. Please contact the store administrator for assistance.
        </p>
        <Button type="button" className="mt-6 w-full" onClick={closeModal}>
          Close
        </Button>
      </div>
    </div>
  );
}
