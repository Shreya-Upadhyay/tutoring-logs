// One-off data migrations that must run BEFORE `prisma db push`, because
// `db push` refuses changes that would lose data (by design — see db-setup.mjs).
//
// Each migration is idempotent and checks the live schema first, so it is safe
// to run on every build, on a brand-new database, and after a partial run.

import { PrismaClient } from "@prisma/client";

/** Column names currently present on a table ([] when the table doesn't exist). */
async function columnsOf(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    table
  );
  return rows.map((r) => r.column_name);
}

/**
 * `name` -> `firstName` / `lastName`.
 *
 * Splits on the first space: "Alex Rivera" becomes Alex + Rivera, while a
 * single-word entry keeps a null lastName. Runs before the column is dropped so
 * existing tutors and students keep their names.
 */
async function splitNameColumns(prisma, table) {
  const columns = await columnsOf(prisma, table);
  if (columns.length === 0) return `${table}: table not created yet, nothing to migrate`;
  if (!columns.includes("name")) return `${table}: already migrated`;

  const updated = await prisma.$transaction(async (tx) => {
    if (!columns.includes("firstName")) {
      await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "firstName" TEXT`);
    }
    if (!columns.includes("lastName")) {
      await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "lastName" TEXT`);
    }

    // 'Unknown' is a last resort for a null/blank legacy name: firstName
    // becomes NOT NULL once db push runs, so it cannot be left empty.
    const rows = await tx.$executeRawUnsafe(
      `UPDATE "${table}"
       SET "firstName" = COALESCE(NULLIF(btrim(split_part("name", ' ', 1)), ''), 'Unknown'),
           "lastName" = CASE
             WHEN position(' ' in "name") > 0
             THEN NULLIF(btrim(substring("name" from position(' ' in "name") + 1)), '')
             ELSE NULL
           END
       WHERE "firstName" IS NULL`
    );

    await tx.$executeRawUnsafe(`ALTER TABLE "${table}" DROP COLUMN "name"`);
    return rows;
  });

  return `${table}: split name into firstName/lastName for ${updated} row(s)`;
}

export async function runPreMigrations(connectionString) {
  const prisma = new PrismaClient({ datasources: { db: { url: connectionString } } });

  try {
    for (const table of ["Tutor", "Student"]) {
      console.log(`[pre-migrations] ${await splitNameColumns(prisma, table)}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
