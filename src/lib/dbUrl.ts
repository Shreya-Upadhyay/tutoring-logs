// Vercel's storage integrations don't all use the same env var name: the
// standard Neon integration sets DATABASE_URL, Vercel Postgres sets
// POSTGRES_URL / POSTGRES_PRISMA_URL, and if you give the integration a
// "Custom Prefix" (because a DATABASE_URL already exists) you get names like
// STORAGE_URL instead. Rather than making the user rename anything, resolve
// the connection string from any of them.
//
// Values that don't look like a Postgres URL are ignored, so a leftover or
// placeholder DATABASE_URL can't shadow a real connection string.

const POSTGRES_SCHEME = /^postgres(ql)?:\/\//i;
const NON_POOLED_HINT = /NON_POOLING|UNPOOLED|DIRECT/i;

const POOLED_CANDIDATES = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT_CANDIDATES = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
];

export interface ResolvedUrl {
  name: string;
  value: string;
}

function isPostgresUrl(value: string | undefined): boolean {
  return typeof value === "string" && POSTGRES_SCHEME.test(value.trim());
}

function firstValid(names: string[]): ResolvedUrl | null {
  for (const name of names) {
    const value = process.env[name];
    if (isPostgresUrl(value)) return { name, value: (value as string).trim() };
  }
  return null;
}

/**
 * Last resort: any `*_URL` environment variable whose value is a Postgres
 * connection string. Covers custom-prefixed names (e.g. STORAGE_URL).
 */
function scanEnvironment(prefer: "pooled" | "direct"): ResolvedUrl | null {
  const found = Object.entries(process.env)
    .filter(([name, value]) => /_URL(_|$)/i.test(name) && isPostgresUrl(value))
    .map(([name, value]) => ({ name, value: (value as string).trim() }));

  if (found.length === 0) return null;

  const matchesPreference = found.filter((entry) =>
    prefer === "direct" ? NON_POOLED_HINT.test(entry.name) : !NON_POOLED_HINT.test(entry.name)
  );

  return matchesPreference[0] ?? found[0];
}

/** Connection string for the running app (prefers a pooled connection). */
export function resolveDatabaseUrl(): string | null {
  const resolved = firstValid(POOLED_CANDIDATES) ?? scanEnvironment("pooled");
  return resolved?.value ?? null;
}

/** Connection string for schema changes (prefers a direct, non-pooled connection). */
export function resolveDirectDatabaseUrl(): ResolvedUrl | null {
  return firstValid(DIRECT_CANDIDATES) ?? scanEnvironment("direct");
}

export const MISSING_DB_URL_MESSAGE = [
  "No Postgres connection string found.",
  "",
  "The app accepts DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, or any",
  "environment variable containing _URL whose value starts with postgres://",
  "",
  "On Vercel: open the project -> Storage -> Create Database -> Postgres.",
  "That adds the variable automatically. Then redeploy.",
].join("\n");
