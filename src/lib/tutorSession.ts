import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// The session cookie holds an account id plus an HMAC of that id, so a visitor
// cannot simply edit the cookie to become another account. Set AUTH_SECRET in
// the environment; it falls back to DATABASE_URL (also secret, and stable) so
// sessions still cannot be forged if AUTH_SECRET was never configured.

export const TUTOR_COOKIE = "lvaep_session";

function sessionSecret(): string {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || "insecure-development-secret";
}

function signature(accountId: string): string {
  return createHmac("sha256", sessionSecret()).update(accountId).digest("base64url");
}

export function getCurrentTutorId(): string | null {
  const raw = cookies().get(TUTOR_COOKIE)?.value;
  if (!raw) return null;

  const separator = raw.lastIndexOf(".");
  if (separator < 1) return null;

  const accountId = raw.slice(0, separator);
  const provided = Buffer.from(raw.slice(separator + 1));
  const expected = Buffer.from(signature(accountId));

  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? accountId : null;
}

export function setTutorCookie(accountId: string): void {
  cookies().set(TUTOR_COOKIE, `${accountId}.${signature(accountId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearTutorCookie(): void {
  cookies().delete(TUTOR_COOKIE);
}
