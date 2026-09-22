// Creates/updates the database tables during the build so a fresh Vercel
// deployment works with no manual migration step.
//
// Uses `prisma db push` (idempotent, no migration history needed). It is run
// WITHOUT --accept-data-loss on purpose: if a future schema change would drop
// data, the build fails loudly instead of silently destroying records.

import { execSync } from "node:child_process";

const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
];

function firstSet(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return { name, value: value.trim() };
  }
  return null;
}

// Schema changes prefer a direct (non-pooled) connection; fall back to pooled.
const conn = firstSet(DIRECT) ?? firstSet(POOLED);

// No database attached yet: warn loudly but let the build succeed, so the site
// still deploys and shows the "check your database" page instead of failing the
// whole deployment. Attaching a database and redeploying creates the tables.
if (!conn) {
  console.warn("\n[db-setup] WARNING: no Postgres connection string found — skipping schema setup.");
  console.warn(`[db-setup] Looked for: ${[...new Set([...POOLED, ...DIRECT])].join(", ")}`);
  console.warn(
    "[db-setup] On Vercel: project -> Storage -> Create Database -> Postgres, then redeploy.\n"
  );
  process.exit(0);
}

console.log(`[db-setup] Applying schema using ${conn.name}...`);

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
