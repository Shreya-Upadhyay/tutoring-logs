"use client";

import { useMemo, useState } from "react";
import Calendar, { CalendarMark } from "@/components/Calendar";
import AttendanceEntryForm, { ExistingEntry } from "@/components/AttendanceEntryForm";
import { buildAttendanceGrid, FlatAttendanceEntry } from "@/lib/attendanceGrid";
import { downloadAttendancePdf } from "@/lib/pdf";
import { fiscalYearsFromDates } from "@/lib/fiscalYear";

export interface AttendanceEntryDTO {
  id: string;
  date: string; // ISO
  type: ExistingEntry["type"];
  hours: number | null;
  notes: string | null;
}

export default function AttendanceSection({
  studentId,
  studentName,
  tutorName,
  site,
  entries,
}: {
  studentId: string;
  studentName: string;
  tutorName: string;
  site: string | null;
  entries: AttendanceEntryDTO[];
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fyOptions = useMemo(
    () => fiscalYearsFromDates(entries.map((e) => new Date(e.date))),
    [entries]
  );
  const [fy, setFy] = useState(fyOptions[0]);
  const activeFy = fyOptions.includes(fy) ? fy : fyOptions[0];

  const marks: CalendarMark[] = entries.map((e) => ({
    date: new Date(e.date),
    label: e.type === "HOURS" ? `${e.hours}h` : e.type === "TUTOR_ABSENT" ? "TA" : e.type === "STUDENT_ABSENT" ? "SA" : "H",
    isAbsence: e.type !== "HOURS",
  }));

  const flatEntries: FlatAttendanceEntry[] = entries.map((e) => ({
    date: e.date,
    type: e.type,
    hours: e.hours,
  }));

  const grid = useMemo(() => buildAttendanceGrid(flatEntries, activeFy), [flatEntries, activeFy]);

  const existingForSelected: ExistingEntry | null = selectedDate
    ? (() => {
        const match = entries.find(
          (e) =>
            new Date(e.date).toDateString() === selectedDate.toDateString()
        );
        return match ? { id: match.id, type: match.type, hours: match.hours, notes: match.notes } : null;
      })()
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Calendar marks={marks} onSelectDate={setSelectedDate} selectedDate={selectedDate} />
        {selectedDate ? (
          <AttendanceEntryForm
            studentId={studentId}
            date={selectedDate}
            existing={existingForSelected}
            onDone={() => setSelectedDate(null)}
          />
        ) : (
          <div className="card flex items-center justify-center p-6 text-center text-sm text-slate-500">
            Click a day on the calendar to log hours tutored, or mark it Tutor Absent, Student
            Absent, or a Holiday.
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="fy">
              Fiscal year:
            </label>
            <select
              id="fy"
              className="input w-auto"
              value={activeFy}
              onChange={(e) => setFy(e.target.value)}
            >
              {fyOptions.map((y) => (
                <option key={y} value={y}>
                  FY {y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              downloadAttendancePdf({
                studentName,
                tutorName,
                site,
                fyLabel: activeFy,
                grid,
              })
            }
          >
            Download attendance sheet (PDF)
          </button>
        </div>

        <div className="card overflow-x-auto p-2">
          <table className="w-full min-w-[820px] table-fixed border-collapse text-xs">
            <thead>
              <tr>
                <th className="w-10 border border-slate-200 bg-slate-50 py-1 text-slate-500">Day</th>
                {grid.monthLabels.map((m) => (
                  <th key={m} className="border border-slate-200 bg-slate-50 py-1 text-slate-500">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.cells.map((row, i) => (
                <tr key={i}>
                  <td className="border border-slate-100 py-1 text-center font-medium text-slate-500">
                    {i + 1}
                  </td>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`border border-slate-100 py-1 text-center ${
                        cell === "TA" || cell === "SA" || cell === "H"
                          ? "bg-amber-50 font-medium text-amber-700"
                          : cell && cell !== "—"
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-300"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-brand-50 font-semibold">
                <td className="border border-slate-200 py-1 text-center">Total</td>
                {grid.monthTotals.map((t, j) => (
                  <td key={j} className="border border-slate-200 py-1 text-center">
                    {t || ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Grand total for FY {activeFy}: <span className="font-medium">{grid.grandTotal} hours</span>
        </p>
      </div>
    </div>
  );
}
