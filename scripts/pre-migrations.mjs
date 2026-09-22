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

/**
 * Adds the sign-in columns.
 *
 * `prisma db push` cannot do this unattended: adding a UNIQUE constraint to a
 * table that already holds rows is a change it asks to confirm, so it aborts
 * in a non-interactive build. Applying the DDL here is explicit, idempotent,
 * and leaves nothing for the push to do.
 */
async function ensureAuthColumns(prisma) {
  const columns = await columnsOf(prisma, "Tutor");
  if (columns.length === 0) return "Tutor: table not created yet, nothing to add";

  const added = [];

  if (!columns.includes("email")) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN "email" TEXT`);
    added.push("email");
  }
  if (!columns.includes("passwordHash")) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN "passwordHash" TEXT`);
    added.push("passwordHash");
  }

  // Postgres treats NULLs as distinct, so this holds even while existing rows
  // have no email yet.
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Tutor_email_key" ON "Tutor"("email")`
  );

  return added.length > 0
    ? `Tutor: added ${added.join(", ")} and the unique email index`
    : "Tutor: sign-in columns already present";
}

/**
 * Removes accounts that have no password. Those are accounts from before
 * sign-in existed; the program starts fresh from sign-up instead of carrying
 * them forward. Their students, attendance and achievements cascade with them.
 *
 * Runs AFTER the schema push, because it needs the passwordHash column to
 * exist. Once there are none left this is a no-op on every later build.
 */
async function purgePasswordlessAccounts(prisma) {
  const columns = await columnsOf(prisma, "Tutor");
  if (columns.length === 0) return "Tutor: table not created yet, nothing to purge";
  if (!columns.includes("passwordHash")) return "Tutor: passwordHash not added yet, skipping purge";

  const removed = await prisma.$executeRawUnsafe(
    `DELETE FROM "Tutor" WHERE "passwordHash" IS NULL`
  );

  return removed > 0
    ? `Tutor: removed ${removed} account(s) with no password`
    : "Tutor: no password-less accounts to remove";
}

export async function runPostMigrations(connectionString) {
  const prisma = new PrismaClient({ datasources: { db: { url: connectionString } } });

  try {
    console.log(`[post-migrations] ${await purgePasswordlessAccounts(prisma)}`);
  } finally {
    await prisma.$disconnect();
  }
}

export async function runPreMigrations(connectionString) {
  const prisma = new PrismaClient({ datasources: { db: { url: connectionString } } });

  try {
    for (const table of ["Tutor", "Student"]) {
      console.log(`[pre-migrations] ${await splitNameColumns(prisma, table)}`);
    }
    console.log(`[pre-migrations] ${await ensureAuthColumns(prisma)}`);
  } finally {
    await prisma.$disconnect();
  }
}
