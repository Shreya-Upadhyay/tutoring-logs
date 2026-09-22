import { prisma } from "@/lib/prisma";
import { createTutor, pickTutor } from "@/lib/actions";
import { getCurrentTutorId } from "@/lib/tutorSession";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const existingId = getCurrentTutorId();
  if (existingId) {
    const existing = await prisma.tutor.findUnique({ where: { id: existingId } });
    if (existing) redirect("/");
  }

  const tutors = await prisma.tutor.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Welcome to LVAEP Tutoring Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Literacy Volunteers of America, Essex/Passaic County
        </p>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Set up your tutor profile</h2>
        <form action={createTutor} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Your name *
            </label>
            <input id="name" name="name" className="input" required placeholder="Jane Smith" />
          </div>
          <div>
            <label className="label" htmlFor="site">
              Tutoring site (optional)
            </label>
            <input
              id="site"
              name="site"
              className="input"
              placeholder="Bloomfield Public Library"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="days">
                Day(s) (optional)
              </label>
              <input id="days" name="days" className="input" placeholder="Tue & Thu" />
            </div>
            <div>
              <label className="label" htmlFor="times">
                Time(s) (optional)
              </label>
              <input id="times" name="times" className="input" placeholder="4:00 - 5:30 PM" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">
            Continue
          </button>
        </form>
      </div>

      {tutors.length > 0 && (
        <div className="mt-6 card p-4">
          <p className="mb-2 text-sm font-medium text-slate-600">
            Already have a profile? Pick it up on this device:
          </p>
          <div className="flex flex-wrap gap-2">
            {tutors.map((t) => (
              <form key={t.id} action={pickTutor.bind(null, t.id)}>
                <button type="submit" className="btn-secondary">
                  {t.name}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
