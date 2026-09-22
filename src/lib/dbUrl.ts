// Vercel's Postgres / Neon integrations don't all use the same env var name,
// depending on which one you provision and when. Rather than forcing the user
// to rename anything in the Vercel dashboard, resolve the connection string
// from any of the names those integrations are known to set.

const POOLED_CANDIDATES = [
  "DATABASE_URL", // Neon integration / manual setup
  "POSTGRES_PRISMA_URL", // Vercel Postgres (pooled, Prisma-tuned)
  "POSTGRES_URL", // Vercel Postgres (pooled)
];

const DIRECT_CANDIDATES = [
  "DATABASE_URL_UNPOOLED", // Neon integration
  "POSTGRES_URL_NON_POOLING", // Vercel Postgres
  "DATABASE_URL",
  "POSTGRES_URL",
];

function firstSet(names: string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return { name, value: value.trim() };
  }
  return null;
}

/** Connection string for the running app (prefers a pooled connection). */
export function resolveDatabaseUrl(): string | null {
  return firstSet(POOLED_CANDIDATES)?.value ?? null;
}

/** Connection string for schema changes (prefers a direct, non-pooled connection). */
export function resolveDirectDatabaseUrl(): { name: string; value: string } | null {
  return firstSet(DIRECT_CANDIDATES);
}

export const MISSING_DB_URL_MESSAGE = [
  "No Postgres connection string found.",
  "",
  "Set one of these environment variables for the project:",
  `  ${POOLED_CANDIDATES.join(", ")}`,
  "",
  "On Vercel: open the project -> Storage -> Create Database -> Postgres.",
  "That adds the variable automatically. Then redeploy.",
].join("\n");
