import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAccount, isStaff } from "@/lib/account";
import ContactInfoBox from "@/components/ContactInfoBox";
import DirectionsBox from "@/components/DirectionsBox";
import StudentList, { StudentListItem } from "@/components/StudentList";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { fullName } from "@/lib/personName";
import { avatarClass } from "@/lib/avatarColor";
import { initialsOf } from "@/lib/personName";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const account = await requireAccount();
  const staff = isStaff(account);
  const currentFY = fiscalYearOf(new Date());

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-1 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Literacy Volunteers of America, Essex/Passaic County
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Student Attendance &amp; Achievement Tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Signed in as</span>
          <Link href="/profile" className="font-medium text-brand-600 hover:underline">
            {fullName(account)}
          </Link>
          {staff && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
              Staff
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="space-y-8">
          {/* Everyone can tutor, so their own students come first; the staff
              view is an additional section rather than a replacement. */}
          <TutorDashboard tutorId={account.id} currentFY={currentFY} />
          {staff && <StaffOverview currentFY={currentFY} viewerId={account.id} />}
        </section>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Reports
            </h2>
            <p className="mb-3 text-sm text-slate-600">
              Monthly and annual totals{staff ? " across the program" : " for your students"},
              ready to download.
            </p>
            <Link href="/reports" className="btn-primary w-full">
              Open reports
            </Link>
          </div>
          <ContactInfoBox />
          <DirectionsBox />
        </aside>
      </div>
    </main>
  );
}

async function TutorDashboard({ tutorId, currentFY }: { tutorId: string; currentFY: string }) {
  const students = await prisma.student.findMany({
    where: { tutorId },
    orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    include: { attendance: true },
  });

  const items: StudentListItem[] = students.map((s) => ({
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

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Your Students</h2>
        <Link href="/students/new" className="btn-primary">
          + Create New Student
        </Link>
      </div>
      <StudentList students={items} />
    </>
  );
}

/** LVAEP staff also see one layer up: every other tutor and their students. */
async function StaffOverview({
  currentFY,
  viewerId,
}: {
  currentFY: string;
  viewerId: string;
}) {
  const tutors = await prisma.tutor.findMany({
    // The viewer's own students already have their own section above.
    where: { NOT: { id: viewerId } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { students: { include: { attendance: true } } },
  });

  const programHours =
    Math.round(
      tutors
        .flatMap((t) => t.students.flatMap((s) => s.attendance))
        .filter((a) => a.type === "HOURS" && fiscalYearOf(a.date) === currentFY)
        .reduce((sum, a) => sum + (a.hours ?? 0), 0) * 10
    ) / 10;

  return (
    <>
      <div className="mb-4 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-semibold text-slate-900">All Tutors</h2>
        <p className="text-xs uppercase tracking-wide text-slate-400">LVAEP staff view</p>
        <p className="text-sm text-slate-500">
          {tutors.length} other tutor{tutors.length === 1 ? "" : "s"} &middot;{" "}
          {tutors.reduce((n, t) => n + t.students.filter((s) => s.active).length, 0)} active
          students &middot; {programHours} hours in FY {currentFY}
        </p>
      </div>

      {tutors.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          No other tutors have registered yet.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {tutors.map((tutor) => {
            const name = fullName(tutor);
            const hours =
              Math.round(
                tutor.students
                  .flatMap((s) => s.attendance)
                  .filter((a) => a.type === "HOURS" && fiscalYearOf(a.date) === currentFY)
                  .reduce((sum, a) => sum + (a.hours ?? 0), 0) * 10
              ) / 10;

            return (
              <li key={tutor.id}>
                <Link
                  href={`/tutors/${tutor.id}`}
                  className="card flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-md"
                >
                  <span
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClass(
                      name
                    )}`}
                  >
                    {initialsOf(tutor)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {tutor.students.filter((s) => s.active).length} active students &middot;{" "}
                      {hours}h this FY
                    </span>
                    {tutor.site && (
                      <span className="block truncate text-xs text-slate-400">{tutor.site}</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
