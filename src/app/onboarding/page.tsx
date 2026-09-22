import { prisma } from "@/lib/prisma";
import { pickTutor } from "@/lib/actions";
import { getCurrentTutorId } from "@/lib/tutorSession";
import { fullName } from "@/lib/personName";
import { redirect } from "next/navigation";
import RegistrationForm from "@/components/RegistrationForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const existingId = getCurrentTutorId();
  if (existingId) {
    const existing = await prisma.tutor.findUnique({ where: { id: existingId } });
    if (existing) redirect("/");
  }

  const accounts = await prisma.tutor.findMany({
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Welcome to LVAEP Tutoring Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Literacy Volunteers of America, Essex/Passaic County
        </p>
      </div>

      <RegistrationForm staffCodeRequired={Boolean(process.env.STAFF_ACCESS_CODE)} />

      {accounts.length > 0 && (
        <div className="mt-6 card p-4">
          <p className="mb-2 text-sm font-medium text-slate-600">
            Already registered? Pick up your account on this device:
          </p>
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <form key={account.id} action={pickTutor.bind(null, account.id)}>
                <button type="submit" className="btn-secondary">
                  {fullName(account)}
                  {account.role === "STAFF" && (
                    <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      Staff
                    </span>
                  )}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
