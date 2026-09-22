// Creates/updates the database tables during the build so a fresh Vercel
// deployment works with no manual migration step.
//
// Uses `prisma db push` (idempotent, no migration history needed). It is run
// WITHOUT --accept-data-loss on purpose: if a future schema change would drop
// data, the build fails loudly instead of silently destroying records.
//
// Connection-string resolution mirrors src/lib/dbUrl.ts — see the comment
// there for why several names (and a generic *_URL scan) are supported.

import { execSync } from "node:child_process";

const POSTGRES_SCHEME = /^postgres(ql)?:\/\//i;
const NON_POOLED_HINT = /NON_POOLING|UNPOOLED|DIRECT/i;

const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
];

const isPostgresUrl = (value) => typeof value === "string" && POSTGRES_SCHEME.test(value.trim());

function firstValid(names) {
  for (const name of names) {
    const value = process.env[name];
    if (isPostgresUrl(value)) return { name, value: value.trim() };
  }
  return null;
}

function scanEnvironment(prefer) {
  const found = Object.entries(process.env)
    .filter(([name, value]) => /_URL(_|$)/i.test(name) && isPostgresUrl(value))
    .map(([name, value]) => ({ name, value: value.trim() }));

  if (found.length === 0) return null;

  const preferred = found.filter((entry) =>
    prefer === "direct" ? NON_POOLED_HINT.test(entry.name) : !NON_POOLED_HINT.test(entry.name)
  );

  return preferred[0] ?? found[0];
}

// Schema changes prefer a direct (non-pooled) connection; fall back to pooled.
const conn =
  firstValid(DIRECT) ?? firstValid(POOLED) ?? scanEnvironment("direct") ?? scanEnvironment("pooled");

// No database attached yet: warn loudly but let the build succeed, so the site
// still deploys and shows the "check your database" page instead of failing the
// whole deployment. Attaching a database and redeploying creates the tables.
if (!conn) {
  console.warn("\n[db-setup] WARNING: no Postgres connection string found — skipping schema setup.");
  console.warn(
    "[db-setup] Accepts DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, or any variable " +
      "containing _URL whose value starts with postgres://"
  );
  console.warn(
    "[db-setup] On Vercel: project -> Storage -> Create Database -> Postgres, then redeploy.\n"
  );
  process.exit(0);
}

console.log(`[db-setup] Applying schema using ${conn.name}...`);

// Data migrations that have to happen before db push (it refuses data loss).
try {
  const { runPreMigrations } = await import("./pre-migrations.mjs");
  await runPreMigrations(conn.value);
} catch (error) {
  console.error("\n[db-setup] Pre-migration step failed:", error?.message ?? error, "\n");
  process.exit(1);
}

try {
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: conn.value },
  });
  console.log("[db-setup] Schema is up to date.");
} catch {
  console.error(
    "\n[db-setup] Could not apply the schema. Check that the database is reachable " +
      `and that ${conn.name} is a valid Postgres connection string.\n`
  );
  process.exit(1);
}
