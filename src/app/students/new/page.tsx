import Link from "next/link";
import { requireTutorAccount } from "@/lib/account";
import { createStudent } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await requireTutorAccount();

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link href="/" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        &larr; Back to dashboard
      </Link>

      <div className="card p-6">
        <h1 className="mb-4 text-xl font-semibold">Create a new student</h1>
        <form action={createStudent} className="space-y-4">
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
                placeholder="Alex"
              />
            </div>
            <div>
              <label className="label" htmlFor="lastName">
                Last name
              </label>
              <input id="lastName" name="lastName" className="input" placeholder="Rivera" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="site">
              Tutoring site
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
                Day(s)
              </label>
              <input id="days" name="days" className="input" placeholder="Tue & Thu" />
            </div>
            <div>
              <label className="label" htmlFor="times">
                Time(s)
              </label>
              <input id="times" name="times" className="input" placeholder="4:00 - 5:30 PM" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">
            Create student
          </button>
        </form>
      </div>
    </main>
  );
}
