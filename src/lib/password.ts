import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt from Node's standard library: a real password KDF with no dependency
// to keep current. Stored as scheme:salt:hash so the scheme can be upgraded
// later without invalidating existing passwords.

const KEY_LENGTH = 64;

export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, expected.length);
  // Lengths match by construction, but timingSafeEqual throws if they differ.
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
