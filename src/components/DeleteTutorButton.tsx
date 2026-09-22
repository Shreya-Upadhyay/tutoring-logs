"use client";

import { useState, useTransition } from "react";
import { deleteTutor } from "@/lib/actions";

export default function DeleteTutorButton({
  tutorId,
  tutorName,
  studentCount,
}: {
  tutorId: string;
  tutorName: string;
  studentCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const blocked = studentCount > 0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-slate-400 underline hover:text-red-600"
      >
        Delete this tutor profile
      </button>
    );
  }

  return (
    <div className="card border-red-300 p-4 text-left">
      <p className="text-sm font-semibold text-slate-900">Delete the profile for {tutorName}?</p>

      {blocked ? (
        <p className="mt-2 text-sm text-slate-600">
          This profile still has{" "}
          <span className="font-medium text-slate-900">
            {studentCount} student{studentCount === 1 ? "" : "s"}
          </span>
          . Delete them from their own pages first — that way you can&apos;t wipe out a term of
          attendance records by accident.
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-600">
          This profile has no students, so nothing else will be lost. This cannot be undone.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn bg-red-600 text-white hover:bg-red-700"
          disabled={pending || blocked}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await deleteTutor(tutorId);
              if (result && !result.ok) setError(result.message ?? "Could not delete.");
            });
          }}
        >
          {pending ? "Deleting..." : "Delete profile"}
        </button>
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
