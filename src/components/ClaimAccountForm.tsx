"use client";

import { useState, useTransition } from "react";
import { claimLegacyAccount } from "@/lib/actions";

/**
 * Accounts that existed before passwords were added have no email or password.
 * This lets their owner set both once, rather than losing the students and
 * attendance already recorded under them.
 */
export default function ClaimAccountForm({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (accounts.length === 0) return null;

  return (
    <div className="mt-4 card p-4 text-left">
      <p className="text-sm font-medium text-slate-700">Finish setting up an older account</p>
      <p className="mt-1 text-xs text-slate-500">
        These accounts were created before passwords were required. Choose yours to add an email
        and password — your students and attendance stay attached.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => {
              setOpenFor(openFor === account.id ? null : account.id);
              setError(null);
            }}
            className={`btn-secondary ${openFor === account.id ? "ring-1 ring-brand-500" : ""}`}
          >
            {account.name}
          </button>
        ))}
      </div>

      {openFor && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await claimLegacyAccount(openFor, formData);
              if (result && !result.ok) setError(result.message ?? "Could not set up the account.");
            });
          }}
          className="mt-4 space-y-3 border-t border-slate-100 pt-4"
        >
          <div>
            <label className="label" htmlFor="claim-email">
              Email
            </label>
            <input id="claim-email" name="email" type="email" className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="claim-password">
                Password
              </label>
              <input
                id="claim-password"
                name="password"
                type="password"
                className="input"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label" htmlFor="claim-confirm">
                Confirm
              </label>
              <input
                id="claim-confirm"
                name="confirmPassword"
                type="password"
                className="input"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Saving..." : "Set password and log in"}
          </button>
        </form>
      )}
    </div>
  );
}
