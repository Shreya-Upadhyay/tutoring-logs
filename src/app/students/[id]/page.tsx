import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAccount, isStaff } from "@/lib/account";
import { updateStudentProfile } from "@/lib/actions";
import { avatarClass } from "@/lib/avatarColor";
import { fullName, initialsOf } from "@/lib/personName";
import AttendanceSection from "@/components/AttendanceSection";
import AchievementsSection from "@/components/AchievementsSection";
import StopTutoringButton from "@/components/StopTutoringButton";
import DeleteStudentButton from "@/components/DeleteStudentButton";
import StudentRecordPdfButton from "@/components/StudentRecordPdfButton";
import StudentMonthReportButton from "@/components/StudentMonthReportButton";
import { toAchievementPdfRows } from "@/lib/achievementsPdfData";
import type { StudentPdfDetails } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export default async function StudentPage({ params }: { params: { id: string } }) {
  const account = await requireAccount();

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      tutor: true,
      attendance: { orderBy: { date: "asc" } },
      achievements: true,
    },
  });

  if (!student) notFound();

  // Staff may read any student; everyone else only their own. Editing follows
  // ownership, so a staff member still edits the students they tutor.
  const owned = student.tutorId === account.id;
  const readOnly = !owned;
  if (!owned && !isStaff(account)) notFound();

  const updateWithId = updateStudentProfile.bind(null, student.id);
  const studentName = fullName(student);

  const details: StudentPdfDetails = {
    studentName,
    tutorName: fullName(student.tutor),
    site: student.site,
    days: student.days,
    times: student.times,
    active: student.active,
    stoppedReason: student.stoppedReason,
  };

  const attendanceEntries = student.attendance.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    type: a.type,
    hours: a.hours,
    notes: a.notes,
  }));

  const achievements = student.achievements.map((a) => ({
    id: a.id,
    category: a.category,
    itemKey: a.itemKey,
    label: a.label,
    attained: a.attained,
    attainedAt: a.attainedAt ? a.attainedAt.toISOString() : null,
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        &larr; Back to dashboard
      </Link>

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold ${avatarClass(
              studentName
            )}`}
          >
            {initialsOf(student)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">{studentName}</h1>
            <p className="text-sm text-slate-500">
              {student.site ?? "No site set"}
              {student.days ? ` · ${student.days}` : ""}
              {student.times ? ` · ${student.times}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Tutor: {details.tutorName}</p>
          </div>
          {readOnly ? (
            <span className="flex-shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
              View only
            </span>
          ) : (
          <details className="flex-shrink-0">
            <summary className="cursor-pointer select-none list-none rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
              Edit details
            </summary>
            <form action={updateWithId} className="mt-3 w-64 space-y-2 text-left">
              <input
                name="firstName"
                className="input"
                defaultValue={student.firstName}
                placeholder="First name"
                required
              />
              <input
                name="lastName"
                className="input"
                defaultValue={student.lastName ?? ""}
                placeholder="Last name"
              />
              <input
                name="site"
                className="input"
                defaultValue={student.site ?? ""}
                placeholder="Tutoring site"
              />
              <input
                name="days"
                className="input"
                defaultValue={student.days ?? ""}
                placeholder="Day(s)"
              />
              <input
                name="times"
                className="input"
                defaultValue={student.times ?? ""}
                placeholder="Time(s)"
              />
              <button type="submit" className="btn-primary w-full">
                Save
              </button>
            </form>
          </details>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-end gap-3 border-t border-slate-100 pt-4">
          <StudentMonthReportButton
            studentId={student.id}
            studentName={studentName}
            tutorName={details.tutorName}
            entries={attendanceEntries.map((a) => ({
              date: a.date,
              type: a.type,
              hours: a.hours,
            }))}
            achievements={toAchievementPdfRows(achievements)}
          />
          <StudentRecordPdfButton
            details={details}
            entries={attendanceEntries.map((a) => ({
              date: a.date,
              type: a.type,
              hours: a.hours,
            }))}
            achievements={achievements}
          />
        </div>
      </div>

      <div className="space-y-4">
        <details className="card overflow-hidden" open>
          <summary className="cursor-pointer select-none list-none border-b border-slate-100 bg-slate-50 px-5 py-3 font-semibold text-slate-900">
            Attendance
          </summary>
          <div className="p-5">
            <AttendanceSection
              studentId={student.id}
              details={details}
              entries={attendanceEntries}
              readOnly={readOnly}
            />
          </div>
        </details>

        <details className="card overflow-hidden">
          <summary className="cursor-pointer select-none list-none border-b border-slate-100 bg-slate-50 px-5 py-3 font-semibold text-slate-900">
            Achievements
          </summary>
          <div className="p-5">
            <AchievementsSection
              studentId={student.id}
              details={details}
              achievements={achievements}
              readOnly={readOnly}
            />
          </div>
        </details>
      </div>

      {readOnly ? (
        !student.active && (
          <div className="mt-8 card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span className="font-semibold">This student is no longer being tutored.</span>
            {student.stoppedReason && <> Reason: {student.stoppedReason}</>}
          </div>
        )
      ) : (
      <div className="mt-8 space-y-6 border-t border-slate-200 pt-6">
        <StopTutoringButton
          studentId={student.id}
          active={student.active}
          stoppedReason={student.stoppedReason}
        />

        <DeleteStudentButton
          studentId={student.id}
          studentName={studentName}
          sessionCount={student.attendance.length}
          totalHours={
            Math.round(student.attendance.reduce((sum, a) => sum + (a.hours ?? 0), 0) * 10) / 10
          }
          achievementCount={student.achievements.filter((a) => a.attained).length}
        />
      </div>
      )}
    </main>
  );
}
