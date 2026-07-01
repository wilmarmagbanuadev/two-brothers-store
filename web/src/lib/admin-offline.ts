"use client";

import type { AdminOrderPayload } from "@/app/dashboard/admin/orders/actions";

const databaseName = "two-brothers-admin";
const databaseVersion = 1;
const orderStore = "queued-orders";
const snapshotStore = "snapshots";
export const adminOrderCatalogSnapshotKey = "admin-order-catalog:v1";
export const adminProductCatalogSnapshotKey = "admin-product-catalog:v1";
export const adminOfflineQueueEvent = "admin-offline-queue-changed";
export const adminOfflineSyncEvent = "admin-offline-sync-completed";
const productImageCacheName = "two-brothers-product-images";

export type QueuedAdminOrder = {
  clientReference: string;
  payload: AdminOrderPayload;
  createdAt: string;
  lastError?: string;
};

type SnapshotRecord<T> = {
  key: string;
  value: T;
  updatedAt: string;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(orderStore)) {
        database.createObjectStore(orderStore, { keyPath: "clientReference" });
      }

      if (!database.objectStoreNames.contains(snapshotStore)) {
        database.createObjectStore(snapshotStore, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
) {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

function notifyQueueChanged() {
  window.dispatchEvent(new Event(adminOfflineQueueEvent));
}

export async function queueAdminOrder(payload: AdminOrderPayload & { clientReference: string }) {
  const queuedOrder: QueuedAdminOrder = {
    clientReference: payload.clientReference,
    payload,
    createdAt: new Date().toISOString()
  };

  await runTransaction(orderStore, "readwrite", (store) => store.put(queuedOrder));
  notifyQueueChanged();

  return queuedOrder;
}

export async function listQueuedAdminOrders() {
  const orders = await runTransaction<QueuedAdminOrder[]>(orderStore, "readonly", (store) => store.getAll());

  return orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeQueuedAdminOrder(clientReference: string) {
  await runTransaction(orderStore, "readwrite", (store) => store.delete(clientReference));
  notifyQueueChanged();
}

export async function updateQueuedAdminOrderError(clientReference: string, lastError: string) {
  const queued = await runTransaction<QueuedAdminOrder | undefined>(
    orderStore,
    "readonly",
    (store) => store.get(clientReference)
  );

  if (!queued) {
    return;
  }

  await runTransaction(orderStore, "readwrite", (store) =>
    store.put({
      ...queued,
      lastError
    })
  );
  notifyQueueChanged();
}

export async function saveAdminSnapshot<T>(key: string, value: T) {
  const record: SnapshotRecord<T> = {
    key,
    value,
    updatedAt: new Date().toISOString()
  };

  await runTransaction(snapshotStore, "readwrite", (store) => store.put(record));
}

export async function loadAdminSnapshot<T>(key: string) {
  const record = await runTransaction<SnapshotRecord<T> | undefined>(
    snapshotStore,
    "readonly",
    (store) => store.get(key)
  );

  return record?.value ?? null;
}

export async function cacheAdminProductImages(imageUrls: Array<string | null>) {
  const cache = await caches.open(productImageCacheName);
  const uniqueUrls = Array.from(new Set(imageUrls.filter((url): url is string => Boolean(url?.trim()))));

  await Promise.allSettled(
    uniqueUrls.map(async (url) => {
      const parsedUrl = new URL(url, window.location.origin);
      const request = new Request(parsedUrl.toString(), {
        cache: "reload",
        credentials: "omit",
        mode: parsedUrl.origin === window.location.origin ? "same-origin" : "no-cors"
      });
      const response = await fetch(request);

      if (response.ok || response.type === "opaque") {
        await cache.put(parsedUrl.toString(), response);
      }
    })
  );
}
