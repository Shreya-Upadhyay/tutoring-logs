"use client";

import { useState, useTransition } from "react";
import { signUp } from "@/lib/actions";

export default function RegistrationForm({ staffCodeRequired }: { staffCodeRequired: boolean }) {
  // Not mutually exclusive: someone can tutor their own students and also hold
  // the LVAEP staff view across the program.
  const [isTutor, setIsTutor] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isTutor && !isStaff) {
      setError("Choose at least one: tutor, LVAEP staff, or both.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("isStaff", String(isStaff));
    setError(null);

    startTransition(async () => {
      const result = await signUp(formData);
      if (result && !result.ok) setError(result.message ?? "Could not register.");
    });
  }

  return (
    <div>
      <p className="label">Which describes you? Choose both if they apply.</p>

      <div className="mb-5 grid grid-cols-2 gap-2">
        <RoleOption
          selected={isTutor}
          onSelect={() => setIsTutor((on) => !on)}
          title="Tutor"
          description="Log your sessions and track your own students"
        />
        <RoleOption
          selected={isStaff}
          onSelect={() => setIsStaff((on) => !on)}
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

        <div>
          <label className="label" htmlFor="email">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="password">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm password *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">At least 8 characters.</p>

        {isTutor && (
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
        )}

        {isStaff && (
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
              The staff view covers every tutor, their students and all reports. It is
              <span className="font-medium"> read-only</span> for other tutors&apos; students —
              those are recorded by whoever holds the sessions
              {isTutor ? ", though you can still record your own" : ""}.
            </p>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Creating account..." : "Create account"}
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
      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
            selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"
          }`}
        >
          {selected ? "✓" : ""}
        </span>
        {title}
      </span>
      <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
    </button>
  );
}
