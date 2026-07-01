"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";

import { saveAdminOrder } from "@/app/dashboard/admin/orders/actions";
import { checkStoreServiceConnection } from "@/app/connection-actions";
import { Button } from "@/components/ui/button";
import {
  adminOfflineQueueEvent,
  adminOfflineSyncEvent,
  listQueuedAdminOrders,
  removeQueuedAdminOrder,
  updateQueuedAdminOrderError
} from "@/lib/admin-offline";
import { directusOnlineEvent } from "@/lib/directus-connectivity";

export function AdminOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState("");
  const syncLock = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      setPendingCount((await listQueuedAdminOrders()).length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const syncOrders = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) {
      await refreshCount();
      return;
    }

    let isStoreOnline = false;

    try {
      isStoreOnline = await checkStoreServiceConnection();
    } catch {
      isStoreOnline = false;
    }

    if (!isStoreOnline) {
      await refreshCount();
      return;
    }

    syncLock.current = true;
    setIsSyncing(true);
    setLastError("");

    try {
      const queuedOrders = await listQueuedAdminOrders();
      let didSyncOrder = false;

      for (const queued of queuedOrders) {
        try {
          await saveAdminOrder(queued.payload);
          await removeQueuedAdminOrder(queued.clientReference);
          didSyncOrder = true;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to synchronize this order.";
          await updateQueuedAdminOrderError(queued.clientReference, message);
          setLastError(message);
        }
      }

      if (didSyncOrder) {
        window.dispatchEvent(new Event(adminOfflineSyncEvent));
      }
    } finally {
      await refreshCount();
      syncLock.current = false;
      setIsSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    void refreshCount();

    const handleQueueChange = () => void refreshCount();
    const handleOnline = () => void syncOrders();
    const timer = window.setInterval(() => void syncOrders(), 30_000);

    window.addEventListener(adminOfflineQueueEvent, handleQueueChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener(directusOnlineEvent, handleOnline);

    if (navigator.onLine) {
      void syncOrders();
    }

    return () => {
      window.removeEventListener(adminOfflineQueueEvent, handleQueueChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener(directusOnlineEvent, handleOnline);
      window.clearInterval(timer);
    };
  }, [refreshCount, syncOrders]);

  if (!pendingCount) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border bg-background p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {pendingCount} order{pendingCount === 1 ? "" : "s"} waiting to sync
          </div>
          {lastError ? <p className="mt-1 truncate text-xs text-muted-foreground">{lastError}</p> : null}
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Retry offline order synchronization"
          title="Retry sync"
          disabled={isSyncing}
          onClick={() => void syncOrders()}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
