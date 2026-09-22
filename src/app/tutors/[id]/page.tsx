import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaffAccount } from "@/lib/account";
import { fullName, initialsOf } from "@/lib/personName";
import { avatarClass } from "@/lib/avatarColor";
import StudentList, { StudentListItem } from "@/components/StudentList";
import { fiscalYearOf } from "@/lib/fiscalYear";

export const dynamic = "force-dynamic";

/** Staff-only: one tutor and the students behind them. View only. */
export default async function TutorPage({ params }: { params: { id: string } }) {
  await requireStaffAccount();

  const tutor = await prisma.tutor.findUnique({
    where: { id: params.id },
    include: {
      students: {
        orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
        include: { attendance: true, achievements: true },
      },
    },
  });

  if (!tutor) notFound();

  const currentFY = fiscalYearOf(new Date());
  const name = fullName(tutor);

  const items: StudentListItem[] = tutor.students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    site: s.site,
    active: s.active,
    stoppedReason: s.stoppedReason,
    hoursThisFY:
      Math.round(
        s.attendance
          .filter((a) => a.type === "HOURS" && fiscalYearOf(a.date) === currentFY)
          .reduce((sum, a) => sum + (a.hours ?? 0), 0) * 10
      ) / 10,
  }));

  const totalHours =
    Math.round(
      tutor.students
        .flatMap((s) => s.attendance)
        .filter((a) => a.type === "HOURS" && fiscalYearOf(a.date) === currentFY)
        .reduce((sum, a) => sum + (a.hours ?? 0), 0) * 10
    ) / 10;

  const goalsMet = tutor.students
    .flatMap((s) => s.achievements)
    .filter((a) => a.attained).length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        &larr; All tutors
      </Link>

      <div className="card mb-6 p-5">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold ${avatarClass(
              name
            )}`}
          >
            {initialsOf(tutor)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">{name}</h1>
            <p className="text-sm text-slate-500">
              {tutor.site ?? "No site set"}
              {tutor.days ? ` · ${tutor.days}` : ""}
              {tutor.times ? ` · ${tutor.times}` : ""}
            </p>
          </div>
          <Link href={`/reports?tutor=${tutor.id}`} className="btn-secondary flex-shrink-0">
            View reports
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
          <Figure label="Students" value={tutor.students.length} />
          <Figure label={`Hours (FY ${currentFY})`} value={totalHours} />
          <Figure label="Goals met" value={goalsMet} />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Students</h2>
        <span className="text-xs text-slate-400">View only</span>
      </div>
      <StudentList students={items} />
    </main>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
