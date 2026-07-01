import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export const adminAccessCookie = "two_brothers_access";
export const adminRefreshCookie = "two_brothers_refresh";
export const userAccessCookie = "two_brothers_user_access";
export const userRefreshCookie = "two_brothers_user_refresh";

const algorithm = "aes-256-gcm";

function sessionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET || "";

  return createHash("sha256").update(secret).digest();
}

export function encryptSessionValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, sessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptSessionValue(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv(algorithm, sessionKey(), iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function cookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  };
}
