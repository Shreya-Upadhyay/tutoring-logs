import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutorId } from "@/lib/tutorSession";
import { updateStudentProfile } from "@/lib/actions";
import { initials, avatarClass } from "@/lib/avatarColor";
import AttendanceSection from "@/components/AttendanceSection";
import AchievementsSection from "@/components/AchievementsSection";
import StopTutoringButton from "@/components/StopTutoringButton";
import DeleteStudentButton from "@/components/DeleteStudentButton";

export const dynamic = "force-dynamic";

export default async function StudentPage({ params }: { params: { id: string } }) {
  const tutorId = getCurrentTutorId();
  if (!tutorId) redirect("/onboarding");

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      tutor: true,
      attendance: { orderBy: { date: "asc" } },
      achievements: true,
    },
  });

  if (!student) notFound();

  const updateWithId = updateStudentProfile.bind(null, student.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        &larr; Back to dashboard
      </Link>

      <div className="card mb-6 p-5">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold ${avatarClass(
              student.name
            )}`}
          >
            {initials(student.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">{student.name}</h1>
            <p className="text-sm text-slate-500">
              {student.site ?? "No site set"}
              {student.days ? ` · ${student.days}` : ""}
              {student.times ? ` · ${student.times}` : ""}
            </p>
          </div>
          <details className="flex-shrink-0">
            <summary className="cursor-pointer select-none list-none rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
              Edit details
            </summary>
            <form action={updateWithId} className="mt-3 w-64 space-y-2 text-left">
              <input name="name" className="input" defaultValue={student.name} required />
              <input name="site" className="input" defaultValue={student.site ?? ""} placeholder="Tutoring site" />
              <input name="days" className="input" defaultValue={student.days ?? ""} placeholder="Day(s)" />
              <input name="times" className="input" defaultValue={student.times ?? ""} placeholder="Time(s)" />
              <button type="submit" className="btn-primary w-full">
                Save
              </button>
            </form>
          </details>
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
              studentName={student.name}
              tutorName={student.tutor.name}
              site={student.site}
              entries={student.attendance.map((a) => ({
                id: a.id,
                date: a.date.toISOString(),
                type: a.type,
                hours: a.hours,
                notes: a.notes,
              }))}
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
              achievements={student.achievements.map((a) => ({
                id: a.id,
                category: a.category,
                itemKey: a.itemKey,
                label: a.label,
                attained: a.attained,
                attainedAt: a.attainedAt ? a.attainedAt.toISOString() : null,
              }))}
            />
          </div>
        </details>
      </div>

      <div className="mt-8 space-y-6 border-t border-slate-200 pt-6">
        <StopTutoringButton
          studentId={student.id}
          active={student.active}
          stoppedReason={student.stoppedReason}
        />

        <DeleteStudentButton
          studentId={student.id}
          studentName={student.name}
          sessionCount={student.attendance.length}
          totalHours={
            Math.round(
              student.attendance.reduce((sum, a) => sum + (a.hours ?? 0), 0) * 10
            ) / 10
          }
          achievementCount={student.achievements.filter((a) => a.attained).length}
        />
      </div>
    </main>
  );
}
