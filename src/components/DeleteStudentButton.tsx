"use client";

import { useState, useTransition } from "react";
import { deleteStudent } from "@/lib/actions";

export default function DeleteStudentButton({
  studentId,
  studentName,
  sessionCount,
  totalHours,
  achievementCount,
}: {
  studentId: string;
  studentName: string;
  sessionCount: number;
  totalHours: number;
  achievementCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Typing the name is only required once there are real records to lose.
  const needsNameConfirmation = sessionCount > 0;
  const canDelete = !needsNameConfirmation || typed.trim() === studentName;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-slate-400 underline hover:text-red-600"
      >
        Delete this student permanently
      </button>
    );
  }

  return (
    <div className="card border-red-300 p-4">
      <p className="text-sm font-semibold text-slate-900">Delete {studentName} permanently?</p>

      <p className="mt-2 text-sm text-slate-600">
        This cannot be undone. It will also delete{" "}
        <span className="font-medium text-slate-900">
          {sessionCount} attendance {sessionCount === 1 ? "entry" : "entries"}
          {sessionCount > 0 && ` (${totalHours} hours)`}
        </span>
        {achievementCount > 0 && (
          <>
            {" "}
            and{" "}
            <span className="font-medium text-slate-900">
              {achievementCount} recorded {achievementCount === 1 ? "achievement" : "achievements"}
            </span>
          </>
        )}
        .
      </p>

      {sessionCount > 0 && (
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          If this student simply stopped being tutored, use{" "}
          <span className="font-semibold">&quot;Student is no longer being tutored&quot;</span>{" "}
          instead — that keeps their hours in the record for reporting.
        </p>
      )}

      {needsNameConfirmation && (
        <div className="mt-3">
          <label className="label" htmlFor="confirm-name">
            Type <span className="font-semibold">{studentName}</span> to confirm
          </label>
          <input
            id="confirm-name"
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn bg-red-600 text-white hover:bg-red-700"
          disabled={pending || !canDelete}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await deleteStudent(studentId);
              if (result && !result.ok) setError(result.message ?? "Could not delete.");
            });
          }}
        >
          {pending ? "Deleting..." : "Delete permanently"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
