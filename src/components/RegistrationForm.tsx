"use client";

import { useState, useTransition } from "react";
import { createTutor } from "@/lib/actions";

type Role = "TUTOR" | "STAFF";

export default function RegistrationForm({ staffCodeRequired }: { staffCodeRequired: boolean }) {
  const [role, setRole] = useState<Role>("TUTOR");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("role", role);
    setError(null);

    startTransition(async () => {
      const result = await createTutor(formData);
      if (result && !result.ok) setError(result.message ?? "Could not register.");
    });
  }

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-semibold">Register</h2>
      <p className="mb-4 text-sm text-slate-500">Which describes you?</p>

      <div className="mb-5 grid grid-cols-2 gap-2">
        <RoleOption
          selected={role === "TUTOR"}
          onSelect={() => setRole("TUTOR")}
          title="Tutor"
          description="Log your sessions and track your students"
        />
        <RoleOption
          selected={role === "STAFF"}
          onSelect={() => setRole("STAFF")}
          title="LVAEP staff"
          description="View every tutor, student and report"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="firstName">
              First name *
            </label>
            <input id="firstName" name="firstName" className="input" required placeholder="Jane" />
          </div>
          <div>
            <label className="label" htmlFor="lastName">
              Last name
            </label>
            <input id="lastName" name="lastName" className="input" placeholder="Smith" />
          </div>
        </div>

        {role === "TUTOR" ? (
          <>
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
          </>
        ) : (
          <>
            {staffCodeRequired && (
              <div>
                <label className="label" htmlFor="accessCode">
                  Staff access code *
                </label>
                <input
                  id="accessCode"
                  name="accessCode"
                  className="input"
                  required
                  autoComplete="off"
                  placeholder="Provided by the office"
                />
              </div>
            )}
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Staff accounts can see every tutor, their students, and all reports. They are
              <span className="font-medium"> view-only</span> — attendance and achievements are
              recorded by the tutor who holds the sessions.
            </p>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Setting up..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

function RoleOption({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-3 text-left transition ${
        selected
          ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
          : "border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="block text-sm font-semibold text-slate-900">{title}</span>
      <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
    </button>
  );
}
