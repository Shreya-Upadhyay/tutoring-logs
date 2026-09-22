import { prisma } from "@/lib/prisma";
import { getCurrentTutorId } from "@/lib/tutorSession";
import { updateTutor, switchTutor } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const tutorId = getCurrentTutorId();
  if (!tutorId) redirect("/onboarding");

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } });
  if (!tutor) redirect("/onboarding");

  const updateWithId = updateTutor.bind(null, tutor.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link href="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        &larr; Back to dashboard
      </Link>

      <div className="card p-6">
        <h1 className="mb-4 text-xl font-semibold">Edit your tutor profile</h1>
        <form action={updateWithId} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Your name *
            </label>
            <input id="name" name="name" className="input" required defaultValue={tutor.name} />
          </div>
          <div>
            <label className="label" htmlFor="site">
              Tutoring site
            </label>
            <input id="site" name="site" className="input" defaultValue={tutor.site ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="days">
                Day(s)
              </label>
              <input id="days" name="days" className="input" defaultValue={tutor.days ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="times">
                Time(s)
              </label>
              <input id="times" name="times" className="input" defaultValue={tutor.times ?? ""} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">
            Save changes
          </button>
        </form>
      </div>

      <form action={switchTutor} className="mt-4">
        <button type="submit" className="btn-secondary w-full">
          Switch tutor profile
        </button>
      </form>
    </main>
  );
}
