"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <div className="card p-6">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page couldn&apos;t load. This is almost always a database connection problem
          rather than a bug in the app itself.
        </p>

        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Things to check:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              A Postgres database exists for this project (Vercel &rarr; Storage &rarr; Create
              Database &rarr; Postgres).
            </li>
            <li>
              The connection string environment variable is set for the Production environment.
            </li>
            <li>
              The project has been redeployed since the database was added — the tables are
              created during the build.
            </li>
          </ol>
        </div>

        {error.digest && (
          <p className="mt-4 text-xs text-slate-400">
            Error reference: <code>{error.digest}</code> — find this in the Vercel deployment
            logs for the full message.
          </p>
        )}

        <button type="button" onClick={reset} className="btn-primary mt-5">
          Try again
        </button>
      </div>
    </main>
  );
}
