"use client";

import { loadAdminSnapshot, saveAdminSnapshot } from "@/lib/admin-offline";

const credentialSnapshotKey = "admin-offline-credential:v1";
const iterations = 310_000;
const requiredWorkerVersion = 7;
const authCacheName = "two-brothers-admin-auth";
const offlineAuthUrl = "/__two_brothers_admin_offline_auth__";
const offlineAuthDuration = 8 * 60 * 60 * 1000;

type OfflineAdminCredential = {
  email: string;
  salt: string;
  verifier: string;
  iterations: number;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function passwordVerifier(password: string, salt: Uint8Array, rounds: number) {
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations: rounds
    },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

export async function enrollOfflineAdminCredential(email: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const verifier = await passwordVerifier(password, salt, iterations);

  await saveAdminSnapshot<OfflineAdminCredential>(credentialSnapshotKey, {
    email: email.trim().toLowerCase(),
    salt: bytesToBase64(salt),
    verifier: bytesToBase64(verifier),
    iterations
  });
}

export async function verifyOfflineAdminCredential(email: string, password: string) {
  const credential = await loadAdminSnapshot<OfflineAdminCredential>(credentialSnapshotKey);

  if (!credential) {
    return "not-enrolled" as const;
  }

  if (credential.email !== email.trim().toLowerCase()) {
    return "invalid" as const;
  }

  const verifier = await passwordVerifier(
    password,
    base64ToBytes(credential.salt),
    credential.iterations
  );

  return equalBytes(verifier, base64ToBytes(credential.verifier))
    ? "valid" as const
    : "invalid" as const;
}

export async function setOfflineAdminAuthenticated(authenticated: boolean) {
  const authCache = await caches.open(authCacheName);

  if (authenticated) {
    await authCache.put(
      offlineAuthUrl,
      new Response(String(Date.now() + offlineAuthDuration), {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-store"
        }
      })
    );
  } else {
    await authCache.delete(offlineAuthUrl);
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Offline login is not supported by this browser.");
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  let registration = registrations.find(
    (entry) => new URL(entry.scope).pathname === "/"
  ) ?? await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    registration = await navigator.serviceWorker.register("/admin-sw.js", {
      scope: "/",
      updateViaCache: "none"
    });
  }

  async function waitForPendingWorker() {
    const pendingWorker = registration?.installing ?? registration?.waiting;

    if (!pendingWorker || pendingWorker.state === "activated") {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 5_000);
      const handleStateChange = () => {
        if (pendingWorker.state === "activated" || pendingWorker.state === "redundant") {
          window.clearTimeout(timeout);
          pendingWorker.removeEventListener("statechange", handleStateChange);
          resolve();
        }
      };

      pendingWorker.addEventListener("statechange", handleStateChange);
      handleStateChange();
    });
  }

  async function sendAuthenticationState(worker: ServiceWorker) {
    return new Promise<number | null>((resolve) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => resolve(null), 2_000);

      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        const version = event.data?.version;

        if (typeof version === "number") {
          resolve(version);
          return;
        }

        if (typeof version === "string") {
          const protocolVersion = Number(version.split("-", 1)[0]);
          resolve(Number.isFinite(protocolVersion) ? protocolVersion : null);
          return;
        }

        resolve(null);
      };

      worker.postMessage({
        type: authenticated ? "SET_ADMIN_OFFLINE_AUTH" : "CLEAR_ADMIN_OFFLINE_AUTH"
      }, [channel.port2]);
    });
  }

  await waitForPendingWorker();
  let worker = registration.active;

  if (!worker) {
    throw new Error("Offline login is still preparing. Refresh once and try again.");
  }

  let acknowledgedVersion = await sendAuthenticationState(worker);

  if (
    (acknowledgedVersion !== null && acknowledgedVersion >= requiredWorkerVersion) ||
    !navigator.onLine
  ) {
    return;
  }

  try {
    registration = await navigator.serviceWorker.register("/admin-sw.js", {
      scope: "/",
      updateViaCache: "none"
    });
    await registration.update();
    await waitForPendingWorker();
    worker = registration.active;

    if (worker) {
      acknowledgedVersion = await sendAuthenticationState(worker);
    }
  } catch {
    // The current worker remains usable if the update check cannot connect.
  }

  if (acknowledgedVersion === null || acknowledgedVersion < requiredWorkerVersion) {
    throw new Error("Offline login is still updating. Refresh once and try again.");
  }
}

export async function hasOfflineAdminDashboard() {
  return Boolean(
    await caches.match("/dashboard/admin", {
      ignoreVary: true
    })
  );
}

export async function isOfflineAdminAuthenticated() {
  const authCache = await caches.open(authCacheName);
  const response = await authCache.match(offlineAuthUrl);

  if (!response) {
    return false;
  }

  const expiresAt = Number(await response.text());

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await authCache.delete(offlineAuthUrl);
    return false;
  }

  return true;
}
