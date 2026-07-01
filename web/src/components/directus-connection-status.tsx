"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, LoaderCircle } from "lucide-react";

import { checkStoreServiceConnection } from "@/app/connection-actions";
import { directusOnlineEvent } from "@/lib/directus-connectivity";

type ConnectionState = "checking" | "online" | "offline";

type DirectusConnectionStatusProps = {
  className?: string;
  initialState?: ConnectionState;
  offlineOnly?: boolean;
};

export function DirectusConnectionStatus({
  className = "",
  initialState = "checking",
  offlineOnly = false
}: DirectusConnectionStatusProps) {
  const [state, setState] = useState<ConnectionState>(initialState);
  const stateRef = useRef<ConnectionState>(initialState);

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setState("offline");
      return;
    }

    try {
      const isOnline = await checkStoreServiceConnection();
      const nextState: ConnectionState = isOnline ? "online" : "offline";
      const didReconnect = nextState === "online" && stateRef.current !== "online";

      stateRef.current = nextState;
      setState(nextState);

      if (didReconnect) {
        window.setTimeout(() => {
          window.dispatchEvent(new Event(directusOnlineEvent));
        }, 0);
      }
    } catch {
      stateRef.current = "offline";
      setState("offline");
    }
  }, []);

  useEffect(() => {
    void checkConnection();

    const timer = window.setInterval(() => void checkConnection(), 15_000);
    const handleConnectionChange = () => void checkConnection();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkConnection();
      }
    };

    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkConnection]);

  if (offlineOnly && state !== "offline") {
    return null;
  }

  const Icon = state === "checking" ? LoaderCircle : state === "online" ? Cloud : CloudOff;
  const label = state === "checking"
    ? "Checking connection"
    : state === "online"
      ? "Online"
      : "System is offline";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        state === "offline"
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-border bg-muted/30 text-muted-foreground"
      } ${className}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${state === "checking" ? "animate-spin" : ""}`} />
      <span className="font-medium">{label}</span>
    </div>
  );
}
