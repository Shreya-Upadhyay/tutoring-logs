import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutorId } from "@/lib/tutorSession";
import type { Tutor } from "@prisma/client";

export type Account = Tutor;

export async function getCurrentAccount(): Promise<Account | null> {
  const id = getCurrentTutorId();
  if (!id) return null;
  return prisma.tutor.findUnique({ where: { id } });
}

/** Any signed-in account, or off to registration. */
export async function requireAccount(): Promise<Account> {
  const account = await getCurrentAccount();
  if (!account) redirect("/onboarding");
  return account;
}

/**
 * An account that is allowed to change data. LVAEP staff accounts are
 * deliberately read-only, so they get sent back to their overview.
 */
export async function requireTutorAccount(): Promise<Account> {
  const account = await requireAccount();
  if (account.role === "STAFF") redirect("/");
  return account;
}

export function isStaff(account: Account | null): boolean {
  return account?.role === "STAFF";
}
