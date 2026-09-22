"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import clsx from "clsx";

export interface CalendarMark {
  date: Date;
  label: string; // e.g. "2.5h", "TA", "SA", "H"
  isAbsence: boolean;
}

export default function Calendar({
  marks,
  onSelectDate,
  selectedDate,
}: {
  marks: CalendarMark[];
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const leadingBlanks = getDay(startOfMonth(cursor)); // 0 = Sunday

  const markFor = (day: Date) => marks.find((m) => isSameDay(m.date, day));

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          aria-label="Previous month"
        >
          &larr;
        </button>
        <p className="text-sm font-semibold text-slate-900">{format(cursor, "MMMM yyyy")}</p>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          aria-label="Next month"
        >
          &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const mark = markFor(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={clsx(
                "flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors",
                selected
                  ? "bg-brand-600 text-white"
                  : mark
                  ? mark.isAbsence
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : "text-slate-700 hover:bg-slate-100",
                isToday(day) && !selected && "ring-1 ring-brand-400"
              )}
            >
              <span>{format(day, "d")}</span>
              {mark && <span className="text-[9px] font-semibold leading-tight">{mark.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
