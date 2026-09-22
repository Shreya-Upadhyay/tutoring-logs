"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { avatarClass } from "@/lib/avatarColor";
import { fullName, initialsOf, lastNameFirst } from "@/lib/personName";

export interface StudentListItem {
  id: string;
  firstName: string;
  lastName: string | null;
  site: string | null;
  active: boolean;
  stoppedReason: string | null;
  hoursThisFY: number;
}

export default function StudentList({ students }: { students: StudentListItem[] }) {
  const [query, setQuery] = useState("");
  const [showStopped, setShowStopped] = useState(false);

  const filtered = useMemo(() => {
    return students
      .filter((s) => (showStopped ? true : s.active))
      .filter((s) => {
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        // Match either order, so "rivera" and "alex r" both find Alex Rivera.
        return (
          fullName(s).toLowerCase().includes(needle) ||
          lastNameFirst(s).toLowerCase().includes(needle)
        );
      });
  }, [students, query, showStopped]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search by first or last name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input sm:max-w-xs"
        />
        <label className="flex select-none items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showStopped}
            onChange={(e) => setShowStopped(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Show students no longer being tutored
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          {students.length === 0
            ? "No students yet — create your first one above."
            : "No students match your search."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                href={`/students/${s.id}`}
                className={`card flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow-md ${
                  !s.active ? "opacity-60" : ""
                }`}
              >
                <span
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClass(
                    fullName(s)
                  )}`}
                >
                  {initialsOf(s)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">
                    {fullName(s)}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {s.site ?? "No site set"} &middot; {s.hoursThisFY}h this FY
                  </span>
                  {!s.active && (
                    <span className="mt-0.5 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                      Stopped{s.stoppedReason ? `: ${s.stoppedReason}` : ""}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
