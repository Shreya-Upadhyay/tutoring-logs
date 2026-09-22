"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markStudentStopped, reactivateStudent } from "@/lib/actions";

export default function StopTutoringButton({
  studentId,
  active,
  stoppedReason,
}: {
  studentId: string;
  active: boolean;
  stoppedReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!active) {
    return (
      <div className="card flex flex-col gap-3 border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">This student is no longer being tutored.</span>
          {stoppedReason && <> Reason: {stoppedReason}</>}
        </p>
        <button
          type="button"
          className="btn-secondary flex-shrink-0"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await reactivateStudent(studentId);
              router.refresh();
            })
          }
        >
          Resume tutoring
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        Student is no longer being tutored
      </button>
    );
  }

  return (
    <div className="card border-red-200 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-900">
        Mark this student as no longer being tutored
      </p>
      <p className="mb-3 text-xs text-slate-500">
        Please also notify the office as soon as possible.
      </p>
      <label className="label" htmlFor="reason">
        Reason
      </label>
      <input
        id="reason"
        className="input mb-3"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. moved away, schedule conflict, completed goals"
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const fd = new FormData();
              fd.set("reason", reason);
              await markStudentStopped(studentId, fd);
              router.refresh();
              setOpen(false);
            })
          }
        >
          Confirm
        </button>
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
