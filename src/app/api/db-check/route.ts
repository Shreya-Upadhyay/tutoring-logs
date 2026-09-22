import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMPORARY diagnostic: reports whether the live database actually has the
// current schema, so a failed build-time schema push can be identified without
// reading deployment logs. Remove once the schema step is confirmed working.
export const dynamic = "force-dynamic";

export async function GET() {
  const report: Record<string, unknown> = {};

  try {
    const columns = await prisma.$queryRawUnsafe<{ table_name: string; column_name: string }[]>(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name IN ('Tutor', 'Student')
       ORDER BY table_name, column_name`
    );

    report.tutorColumns = columns.filter((c) => c.table_name === "Tutor").map((c) => c.column_name);
    report.studentColumns = columns
      .filter((c) => c.table_name === "Student")
      .map((c) => c.column_name);
  } catch (error) {
    report.columnsError = error instanceof Error ? error.message : String(error);
  }

  try {
    report.accountCount = await prisma.tutor.count();
  } catch (error) {
    report.countError = error instanceof Error ? error.message : String(error);
  }

  try {
    // Fails loudly if the auth columns are missing from the live table.
    const accounts = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*)::int AS n FROM "Tutor" WHERE "passwordHash" IS NULL`
    );
    report.passwordlessAccounts = Number(accounts[0]?.n ?? 0);
  } catch (error) {
    report.authColumnsError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(report);
}
