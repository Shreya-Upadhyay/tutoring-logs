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

/** Any signed-in account, or off to the login page. */
export async function requireAccount(): Promise<Account> {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  return account;
}

/**
 * An account with the LVAEP staff flag, which grants read-only visibility
 * across every tutor. Anyone can also tutor students of their own, so this is
 * an addition to tutoring rather than an alternative to it.
 */
export async function requireStaffAccount(): Promise<Account> {
  const account = await requireAccount();
  if (!account.isStaff) redirect("/");
  return account;
}

export function isStaff(account: Account | null): boolean {
  return account?.isStaff === true;
}
