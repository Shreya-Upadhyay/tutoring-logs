"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { saveAttendanceEntry, deleteAttendanceEntry } from "@/lib/actions";

export interface ExistingEntry {
  id: string;
  type: "HOURS" | "TUTOR_ABSENT" | "STUDENT_ABSENT" | "HOLIDAY";
  hours: number | null;
  notes: string | null;
}

const TYPE_OPTIONS: { value: ExistingEntry["type"]; label: string }[] = [
  { value: "HOURS", label: "Hours tutored" },
  { value: "TUTOR_ABSENT", label: "TA — Tutor Absent" },
  { value: "STUDENT_ABSENT", label: "SA — Student Absent" },
  { value: "HOLIDAY", label: "H — Holiday" },
];

export default function AttendanceEntryForm({
  studentId,
  date,
  existing,
  onDone,
}: {
  studentId: string;
  date: Date;
  existing: ExistingEntry | null;
  onDone: () => void;
}) {
  const [type, setType] = useState<ExistingEntry["type"]>(existing?.type ?? "HOURS");
  const [hours, setHours] = useState(existing?.hours?.toString() ?? "1");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dateStr = format(date, "yyyy-MM-dd");

  function handleSave() {
    setError(null);
    const fd = new FormData();
    fd.set("date", dateStr);
    fd.set("type", type);
    fd.set("hours", hours);
    fd.set("notes", notes);
    startTransition(async () => {
      try {
        await saveAttendanceEntry(studentId, fd);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleDelete() {
    if (!existing) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAttendanceEntry(studentId, existing.id);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="card p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">
        {format(date, "EEEE, MMMM d, yyyy")}
      </p>

      <div className="space-y-3">
        <div>
          <label className="label">What happened this day?</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as ExistingEntry["type"])}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {type === "HOURS" && (
          <div>
            <label className="label" htmlFor="hours">
              Hours tutored
            </label>
            <input
              id="hours"
              type="number"
              min={0.25}
              step={0.25}
              className="input"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="notes">
            Notes (optional)
          </label>
          <input
            id="notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on?"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-primary flex-1" disabled={pending} onClick={handleSave}>
            {pending ? "Saving..." : existing ? "Update" : "Save"}
          </button>
          {existing && (
            <button
              type="button"
              className="btn-danger"
              disabled={pending}
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn-secondary" disabled={pending} onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
