import { prisma } from "@/lib/prisma";
import { getCurrentTutorId } from "@/lib/tutorSession";
import { updateTutor, logOut } from "@/lib/actions";
import { redirect } from "next/navigation";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
        <h1 className="text-xl font-semibold">Edit your profile</h1>
        <p className="mb-4 mt-0.5 text-sm text-slate-500">{tutor.email ?? "No email on file"}</p>
        <form action={updateWithId} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="firstName">
                First name *
              </label>
              <input
                id="firstName"
                name="firstName"
                className="input"
                required
                defaultValue={tutor.firstName}
              />
            </div>
            <div>
              <label className="label" htmlFor="lastName">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                className="input"
                defaultValue={tutor.lastName ?? ""}
              />
            </div>
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

      <div className="mt-4 card p-6">
        <h2 className="mb-4 text-lg font-semibold">Password</h2>
        <ChangePasswordForm />
      </div>

      <form action={logOut} className="mt-4">
        <button type="submit" className="btn-secondary w-full">
          Log out
        </button>
      </form>
    </main>
  );
}
