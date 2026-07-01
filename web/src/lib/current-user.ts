import { cookies } from "next/headers";

import {
  adminAccessCookie,
  adminRefreshCookie,
  decryptSessionValue,
  userAccessCookie,
  userRefreshCookie
} from "@/lib/admin-session";
import { roleNameFromAccessToken } from "@/lib/directus-role";

export type DirectusRoleName = "Admin" | "Customer" | "Administrator";

async function roleFromToken(encryptedToken?: string) {
  if (!encryptedToken) {
    return null;
  }

  try {
    const accessToken = decryptSessionValue(encryptedToken);
    const roleName = await roleNameFromAccessToken(accessToken);

    return roleName === "Admin" || roleName === "Customer" || roleName === "Administrator" ? roleName : null;
  } catch {
    return null;
  }
}

export async function getCurrentDirectusRole() {
  const cookieStore = await cookies();
  const customerRole = await roleFromToken(cookieStore.get(userAccessCookie)?.value);

  if (customerRole) {
    return customerRole;
  }

  if (cookieStore.has(userRefreshCookie)) {
    return "Customer";
  }

  const adminRole = await roleFromToken(cookieStore.get(adminAccessCookie)?.value);

  if (adminRole) {
    return adminRole;
  }

  return cookieStore.has(adminRefreshCookie) ? "Admin" : null;
}
