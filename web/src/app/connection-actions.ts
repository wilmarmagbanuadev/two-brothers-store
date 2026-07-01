"use server";

const directusUrl = process.env.DIRECTUS_URL ?? process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";

export async function checkStoreServiceConnection() {
  try {
    const response = await fetch(`${directusUrl.replace(/\/$/, "")}/server/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });

    return response.ok;
  } catch {
    return false;
  }
}
