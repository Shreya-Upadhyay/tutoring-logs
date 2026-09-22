import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutorId } from "@/lib/tutorSession";
import AuthShell from "@/components/AuthShell";
import RegistrationForm from "@/components/RegistrationForm";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const sessionId = getCurrentTutorId();
  if (sessionId) {
    const existing = await prisma.tutor.findUnique({ where: { id: sessionId } });
    if (existing) redirect("/");
  }

  return (
    <AuthShell
      title="Sign up"
      subtitle="Create your account to start recording sessions."
      footer={
        <p>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <RegistrationForm staffCodeRequired={Boolean(process.env.STAFF_ACCESS_CODE)} />
    </AuthShell>
  );
}
