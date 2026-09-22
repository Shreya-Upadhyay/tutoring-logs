import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutorId } from "@/lib/tutorSession";
import { fullName } from "@/lib/personName";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";
import ClaimAccountForm from "@/components/ClaimAccountForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const sessionId = getCurrentTutorId();
  if (sessionId) {
    const existing = await prisma.tutor.findUnique({ where: { id: sessionId } });
    if (existing) redirect("/");
  }

  const legacyAccounts = await prisma.tutor.findMany({
    where: { passwordHash: null },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back."
      footer={
        <>
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-brand-600 hover:underline">
              Sign up
            </Link>
          </p>
          <ClaimAccountForm
            accounts={legacyAccounts.map((a) => ({ id: a.id, name: fullName(a) }))}
          />
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
