"use client";

import { useMemo, useState } from "react";
import Calendar, { CalendarMark } from "@/components/Calendar";
import AttendanceEntryForm, { ExistingEntry } from "@/components/AttendanceEntryForm";
import { buildAttendanceGrid, FlatAttendanceEntry } from "@/lib/attendanceGrid";
import { downloadAttendancePdf, type StudentPdfDetails } from "@/lib/pdf";
import { fiscalYearsFromDates } from "@/lib/fiscalYear";
import { ATTENDANCE_TYPES, ATTENDANCE_TYPE_LIST, typeFromCode } from "@/lib/attendanceTypes";

export interface AttendanceEntryDTO {
  id: string;
  date: string; // ISO
  type: ExistingEntry["type"];
  hours: number | null;
  notes: string | null;
}

export default function AttendanceSection({
  studentId,
  details,
  entries,
  readOnly = false,
}: {
  studentId: string;
  details: StudentPdfDetails;
  entries: AttendanceEntryDTO[];
  /** Staff accounts can read the record but not change it. */
  readOnly?: boolean;
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
    label: e.type === "HOURS" ? `${e.hours}h` : ATTENDANCE_TYPES[e.type].code,
    cellClass: ATTENDANCE_TYPES[e.type].cellClass,
  }));

  const flatEntries: FlatAttendanceEntry[] = useMemo(
    () => entries.map((e) => ({ date: e.date, type: e.type, hours: e.hours })),
    [entries]
  );

  const grid = useMemo(() => buildAttendanceGrid(flatEntries, activeFy), [flatEntries, activeFy]);

  const existingForSelected: ExistingEntry | null = selectedDate
    ? (() => {
        const match = entries.find(
          (e) => new Date(e.date).toDateString() === selectedDate.toDateString()
        );
        return match
          ? { id: match.id, type: match.type, hours: match.hours, notes: match.notes }
          : null;
      })()
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Calendar marks={marks} onSelectDate={setSelectedDate} selectedDate={selectedDate} />
        {readOnly ? (
          <div className="card p-6 text-sm text-slate-600">
            {selectedDate ? (
              <>
                <p className="font-semibold text-slate-900">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-1">
                  {existingForSelected
                    ? existingForSelected.type === "HOURS"
                      ? `${existingForSelected.hours} hours tutored`
                      : ATTENDANCE_TYPES[existingForSelected.type].label
                    : "Nothing recorded for this day."}
                </p>
                {existingForSelected?.notes && (
                  <p className="mt-1 text-slate-500">{existingForSelected.notes}</p>
                )}
              </>
            ) : (
              <p className="text-center text-slate-500">
                Click a day to see what was recorded. Only the tutor who holds the sessions can
                change these entries.
              </p>
            )}
          </div>
        ) : selectedDate ? (
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

      <Legend />

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
            className="btn-secondary"
            onClick={() => downloadAttendancePdf({ details, fyLabel: activeFy, grid })}
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
                  {row.map((cell, j) => {
                    const type = typeFromCode(cell);
                    return (
                      <td
                        key={j}
                        className={`border border-slate-100 py-1 text-center ${
                          type
                            ? `${ATTENDANCE_TYPES[type].cellClass} ${
                                type === "HOURS" ? "" : "font-semibold"
                              }`
                            : "text-slate-300"
                        }`}
                      >
                        {cell}
                      </td>
                    );
                  })}
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

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
      {ATTENDANCE_TYPE_LIST.map((type) => (
        <span key={type.key} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-full ${type.swatchClass}`} />
          {type.label}
        </span>
      ))}
    </div>
  );
}
