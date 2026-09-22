import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAccount, isStaff } from "@/lib/account";
import { fullName } from "@/lib/personName";
import { fiscalYearOf, FY_MONTH_LABELS } from "@/lib/fiscalYear";
import { buildReport, type ReportPeriod, type ReportStudentInput } from "@/lib/reports";
import { toAchievementPdfRows } from "@/lib/achievementsPdfData";
import type { ReportStudentSection } from "@/lib/reportPdf";
import ReportControls from "@/components/ReportControls";

export const dynamic = "force-dynamic";

/** Parses ?type / ?month / ?fy into a period, defaulting to the current month. */
function periodFromParams(params: { [key: string]: string | undefined }): ReportPeriod {
  const now = new Date();

  if (params.type === "year") {
    return { kind: "year", fiscalYear: params.fy ?? fiscalYearOf(now) };
  }

  const match = /^(\d{4})-(\d{2})$/.exec(params.month ?? "");
  if (match) {
    return { kind: "month", year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
  }
  return { kind: "month", year: now.getFullYear(), monthIndex: now.getMonth() };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const account = await requireAccount();
  const staff = isStaff(account);
  const period = periodFromParams(searchParams);

  /** Comma-separated ids from the URL; empty means "no filter". */
  const idList = (value: string | undefined): string[] =>
    (value ?? "").split(",").filter(Boolean);

  const tutorIds = idList(searchParams.tutors);
  const studentIds = idList(searchParams.students);

  // Tutors only ever see their own students; staff can scope to any set of tutors.
  const tutorFilter = staff
    ? tutorIds.length > 0
      ? { tutorId: { in: tutorIds } }
      : {}
    : { tutorId: account.id };

  const [students, tutors] = await Promise.all([
    prisma.student.findMany({
      where: tutorFilter,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { tutor: true, attendance: true, achievements: true },
    }),
    staff
      ? prisma.tutor.findMany({
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const inputs: ReportStudentInput[] = students.map((student) => ({
    id: student.id,
    studentName: fullName(student),
    tutorId: student.tutorId,
    tutorName: fullName(student.tutor),
    active: student.active,
    attendance: student.attendance.map((a) => ({
      date: a.date.toISOString(),
      type: a.type,
      hours: a.hours,
    })),
    achievementDates: student.achievements
      .filter((a) => a.attained)
      .map((a) => (a.attainedAt ? a.attainedAt.toISOString() : null)),
  }));

  // An optional student scope, so a report can cover one student or a chosen
  // few rather than the whole caseload.
  const scopedStudents =
    studentIds.length > 0 ? students.filter((s) => studentIds.includes(s.id)) : students;
  const scopedInputs =
    studentIds.length > 0 ? inputs.filter((i) => studentIds.includes(i.id)) : inputs;

  const report = buildReport(scopedInputs, period);
  const isYearly = period.kind === "year";

  // Attendance + goals pages appended to the PDF, one set per student in scope.
  const sections: ReportStudentSection[] = scopedStudents.map((student) => ({
    studentId: student.id,
    studentName: fullName(student),
    tutorName: fullName(student.tutor),
    entries: student.attendance.map((a) => ({
      date: a.date.toISOString(),
      type: a.type,
      hours: a.hours,
    })),
    achievements: toAchievementPdfRows(
      student.achievements.map((a) => ({
        itemKey: a.itemKey,
        label: a.label,
        category: a.category,
        attained: a.attained,
        attainedAt: a.attainedAt ? a.attainedAt.toISOString() : null,
      }))
    ),
  }));

  // Fiscal years present in the data, so the picker only offers real options.
  const allDates = students.flatMap((s) => s.attendance.map((a) => a.date));
  const fiscalYears = Array.from(
    new Set([...allDates.map(fiscalYearOf), fiscalYearOf(new Date())])
  ).sort().reverse();

  /** "All tutors", one name, or "3 tutors" - whichever describes the scope. */
  function describe(kind: string, chosen: { firstName: string; lastName: string | null }[], total: number) {
    if (chosen.length === 0) return `All ${kind}s`;
    if (chosen.length === 1) return fullName(chosen[0]);
    return `${chosen.length} of ${total} ${kind}s`;
  }

  const chosenTutors = tutors.filter((t) => tutorIds.includes(t.id));
  const chosenStudents = students.filter((s) => studentIds.includes(s.id));

  const tutorScopeLabel = staff
    ? `Tutors: ${describe("tutor", chosenTutors, tutors.length)}`
    : `Tutor: ${fullName(account)}`;
  const scopeLabel =
    chosenStudents.length > 0
      ? `${tutorScopeLabel} — Students: ${describe("student", chosenStudents, students.length)}`
      : tutorScopeLabel;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        &larr; Back to dashboard
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isYearly ? "Annual Report" : "Monthly Report"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {report.periodLabel} &middot; {scopeLabel}
        </p>
      </header>

      <ReportControls
        report={report}
        scopeLabel={scopeLabel}
        fiscalYears={fiscalYears}
        tutorOptions={staff ? tutors.map((t) => ({ id: t.id, name: fullName(t) })) : null}
        studentOptions={students.map((s) => ({ id: s.id, name: fullName(s) }))}
        sections={sections}
        studentInputs={scopedInputs}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students served" value={report.totals.studentsWithHours} />
        <Stat label="Sessions" value={report.totals.sessions} />
        <Stat label="Total hours" value={report.totals.hours} />
        <Stat label="Goals met" value={report.totals.goalsMet} />
      </div>

      {report.tutorSubtotals.length > 1 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">By tutor</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Tutor</th>
                  <th className="px-4 py-2 text-center">Students</th>
                  <th className="px-4 py-2 text-center">Sessions</th>
                  <th className="px-4 py-2 text-center">Hours</th>
                </tr>
              </thead>
              <tbody>
                {report.tutorSubtotals.map((t) => (
                  <tr key={t.tutorId} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{t.tutorName}</td>
                    <td className="px-4 py-2 text-center">{t.students}</td>
                    <td className="px-4 py-2 text-center">{t.sessions}</td>
                    <td className="px-4 py-2 text-center font-medium">{t.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">By student</h2>
        {report.rows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">
            No students to report on for this period.
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Tutor</th>
                  {isYearly ? (
                    <>
                      {FY_MONTH_LABELS.map((m) => (
                        <th key={m} className="px-2 py-2 text-center">
                          {m}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center">Hours</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-center">Sessions</th>
                      <th className="px-3 py-2 text-center">Hours</th>
                      <th className="px-3 py-2 text-center" title="Tutor Absent">
                        TA
                      </th>
                      <th className="px-3 py-2 text-center" title="Student Absent">
                        SA
                      </th>
                      <th className="px-3 py-2 text-center" title="Holiday">
                        H
                      </th>
                    </>
                  )}
                  <th className="px-3 py-2 text-center">Goals</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.studentId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      <Link href={`/students/${row.studentId}`} className="hover:underline">
                        {row.studentName}
                      </Link>
                      {!row.active && (
                        <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-500">
                          stopped
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{row.tutorName}</td>
                    {isYearly ? (
                      <>
                        {row.monthlyHours.map((h, i) => (
                          <td
                            key={i}
                            className={`px-2 py-2 text-center ${
                              h ? "bg-emerald-50 text-emerald-900" : "text-slate-300"
                            }`}
                          >
                            {h || "·"}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold">{row.hours}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-center">{row.sessions}</td>
                        <td className="px-3 py-2 text-center font-semibold">{row.hours}</td>
                        <td className="px-3 py-2 text-center text-amber-700">
                          {row.tutorAbsences || ""}
                        </td>
                        <td className="px-3 py-2 text-center text-rose-700">
                          {row.studentAbsences || ""}
                        </td>
                        <td className="px-3 py-2 text-center text-violet-700">
                          {row.holidays || ""}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-center">{row.goalsMet || ""}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-brand-50 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td />
                  {isYearly ? (
                    <>
                      {report.totals.monthlyHours.map((h, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          {h || ""}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">{report.totals.hours}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-center">{report.totals.sessions}</td>
                      <td className="px-3 py-2 text-center">{report.totals.hours}</td>
                      <td className="px-3 py-2 text-center">{report.totals.tutorAbsences}</td>
                      <td className="px-3 py-2 text-center">{report.totals.studentAbsences}</td>
                      <td className="px-3 py-2 text-center">{report.totals.holidays}</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-center">{report.totals.goalsMet}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {!isYearly && (
          <p className="mt-2 text-xs text-slate-500">
            TA = Tutor Absent &middot; SA = Student Absent &middot; H = Holiday
          </p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
