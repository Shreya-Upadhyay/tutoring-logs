import Link from "next/link";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <Link href="/" className="text-lg font-bold text-slate-900 hover:underline">
          LVAEP Tutoring Logs
        </Link>
        <p className="mt-1 text-sm text-slate-500">
          Literacy Volunteers of America, Essex/Passaic County
        </p>
      </div>

      <div className="card p-6">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mb-5 mt-0.5 text-sm text-slate-500">{subtitle}</p>
        {children}
      </div>

      <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>
    </main>
  );
}
