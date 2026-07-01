"use client";

import { FormEvent, useEffect, useState } from "react";

import { loginAdmin } from "@/app/sign-in/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  enrollOfflineAdminCredential,
  hasOfflineAdminDashboard,
  setOfflineAdminAuthenticated,
  verifyOfflineAdminCredential
} from "@/lib/admin-offline-auth";

function isConnectivityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    !navigator.onLine ||
    /fetch failed|failed to fetch|network|service is unavailable|unable to log in right now|connection/i.test(message)
  );
}

function isDeploymentMismatchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /failed to find server action|older or newer deployment/i.test(message);
}

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    void navigator.serviceWorker
      .register("/admin-sw.js", {
        scope: "/",
        updateViaCache: "none"
      })
      .then((registration) => registration.update())
      .catch(() => {
        // An existing worker can still provide offline login while disconnected.
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginAdmin({ email: email.trim(), password });

      if (result.ok) {
        await enrollOfflineAdminCredential(email, password);
        await setOfflineAdminAuthenticated(true);
        window.location.assign("/dashboard/admin");
        return;
      }

      if (result.reason !== "unavailable") {
        setError(result.error);
        return;
      }

      const offlineResult = await verifyOfflineAdminCredential(email, password);

      if (offlineResult === "valid") {
        await setOfflineAdminAuthenticated(true);

        if (!navigator.onLine && !(await hasOfflineAdminDashboard())) {
          setError("The offline dashboard is not saved yet. Reconnect and open the admin dashboard once.");
          return;
        }

        window.location.assign("/dashboard/admin");
        return;
      }

      setError(
        offlineResult === "not-enrolled"
          ? "Connect once and log in successfully before using offline login on this device."
          : "The email or password is incorrect."
      );
    } catch (loginError) {
      if (isDeploymentMismatchError(loginError)) {
        window.location.reload();
        return;
      }

      if (!isConnectivityError(loginError)) {
        setError(loginError instanceof Error ? loginError.message : "Unable to log in.");
        return;
      }

      const offlineResult = await verifyOfflineAdminCredential(email, password);

      if (offlineResult === "valid") {
        await setOfflineAdminAuthenticated(true);

        if (!navigator.onLine && !(await hasOfflineAdminDashboard())) {
          setError("The offline dashboard is not saved yet. Reconnect and open the admin dashboard once.");
          return;
        }

        window.location.assign("/dashboard/admin");
        return;
      }

      setError(
        offlineResult === "not-enrolled"
          ? "Connect once and log in successfully before using offline login on this device."
          : "The email or password is incorrect."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
      <Input type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Log In"}
      </Button>
    </form>
  );
}
