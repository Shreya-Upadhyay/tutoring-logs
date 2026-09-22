import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutorId } from "@/lib/tutorSession";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const sessionId = getCurrentTutorId();
  if (sessionId) {
    const existing = await prisma.tutor.findUnique({ where: { id: sessionId } });
    if (existing) redirect("/");
  }

  // Nobody has registered yet, so there is nothing to log in to.
  const accounts = await prisma.tutor.count();
  if (accounts === 0) redirect("/signup");

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-brand-600 hover:underline">
            Sign up
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
