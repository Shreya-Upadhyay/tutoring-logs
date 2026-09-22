import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentTutorId } from "@/lib/tutorSession";
import { redirect } from "next/navigation";
import ContactInfoBox from "@/components/ContactInfoBox";
import DirectionsBox from "@/components/DirectionsBox";
import StudentList, { StudentListItem } from "@/components/StudentList";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { fullName } from "@/lib/personName";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tutorId = getCurrentTutorId();
  if (!tutorId) redirect("/onboarding");

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } });
  if (!tutor) redirect("/onboarding");

  const students = await prisma.student.findMany({
    where: { tutorId },
    orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    include: { attendance: true },
  });

  const currentFY = fiscalYearOf(new Date());
  const items: StudentListItem[] = students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    site: s.site,
    active: s.active,
    stoppedReason: s.stoppedReason,
    hoursThisFY: Math.round(
      s.attendance
        .filter((a) => a.type === "HOURS" && fiscalYearOf(a.date) === currentFY)
        .reduce((sum, a) => sum + (a.hours ?? 0), 0) * 10
    ) / 10,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-1 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Literacy Volunteers of America, Essex/Passaic County
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Student Monthly Attendance &amp; Achievement Tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Signed in as</span>
          <Link href="/profile" className="font-medium text-brand-600 hover:underline">
            {fullName(tutor)}
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Your Students</h2>
            <Link href="/students/new" className="btn-primary">
              + Create New Student
            </Link>
          </div>
          <StudentList students={items} />
        </section>

        <aside className="space-y-4">
          <ContactInfoBox />
          <DirectionsBox />
        </aside>
      </div>
    </main>
  );
}
