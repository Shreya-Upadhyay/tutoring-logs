"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { saveAttendanceEntry, deleteAttendanceEntry } from "@/lib/actions";
import { ATTENDANCE_TYPE_LIST, type AttendanceTypeKey } from "@/lib/attendanceTypes";

export interface ExistingEntry {
  id: string;
  type: AttendanceTypeKey;
  hours: number | null;
  notes: string | null;
}

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
          <div className="grid grid-cols-2 gap-2">
            {ATTENDANCE_TYPE_LIST.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setType(opt.key)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                  type === opt.key
                    ? `${opt.cellClass} border-transparent ring-2 ring-brand-500`
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className={`h-3 w-3 flex-shrink-0 rounded-full ${opt.swatchClass}`} />
                {opt.label}
              </button>
            ))}
          </div>
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
