// Aggregation behind the monthly and yearly reports. Pure functions over plain
// objects so the same logic serves the on-screen table and the PDF.

import { FY_MONTH_ORDER, fiscalYearStartYear } from "@/lib/fiscalYear";
import { cellDisplay, type AttendanceTypeKey } from "@/lib/attendanceTypes";

export interface ReportAttendanceInput {
  date: string; // ISO
  type: AttendanceTypeKey;
  hours: number | null;
}

export interface ReportStudentInput {
  id: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  active: boolean;
  attendance: ReportAttendanceInput[];
  /** attainedAt of each attained achievement (ISO), null when no date recorded. */
  achievementDates: (string | null)[];
}

export type ReportPeriod =
  | { kind: "month"; year: number; monthIndex: number } // monthIndex: 0 = January
  | { kind: "year"; fiscalYear: string };

export interface ReportRow {
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  active: boolean;
  sessions: number;
  hours: number;
  tutorAbsences: number;
  studentAbsences: number;
  holidays: number;
  goalsMet: number;
  /** Hours per month in Jul-Jun order. Only populated for yearly reports. */
  monthlyHours: number[];
}

export interface ReportTotals {
  students: number;
  studentsWithHours: number;
  sessions: number;
  hours: number;
  tutorAbsences: number;
  studentAbsences: number;
  holidays: number;
  goalsMet: number;
  monthlyHours: number[];
}

export interface ReportData {
  period: ReportPeriod;
  periodLabel: string;
  rows: ReportRow[];
  totals: ReportTotals;
  /** Per-tutor subtotals, for staff reports covering more than one tutor. */
  tutorSubtotals: { tutorId: string; tutorName: string; students: number; hours: number; sessions: number }[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Half-open range [start, end) covering the period. */
export function periodRange(period: ReportPeriod): { start: Date; end: Date } {
  if (period.kind === "month") {
    return {
      start: new Date(period.year, period.monthIndex, 1),
      end: new Date(period.year, period.monthIndex + 1, 1),
    };
  }
  const startYear = fiscalYearStartYear(period.fiscalYear);
  return { start: new Date(startYear, 6, 1), end: new Date(startYear + 1, 6, 1) };
}

export function periodLabel(period: ReportPeriod): string {
  return period.kind === "month"
    ? `${MONTH_NAMES[period.monthIndex]} ${period.year}`
    : `FY ${period.fiscalYear} (July ${fiscalYearStartYear(period.fiscalYear)} – June ${
        fiscalYearStartYear(period.fiscalYear) + 1
      })`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function inRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time < end.getTime();
}

export function buildReport(students: ReportStudentInput[], period: ReportPeriod): ReportData {
  const { start, end } = periodRange(period);
  const wantsMonthlyBreakdown = period.kind === "year";

  const rows: ReportRow[] = students.map((student) => {
    const monthlyHours = Array(12).fill(0);
    let sessions = 0;
    let hours = 0;
    let tutorAbsences = 0;
    let studentAbsences = 0;
    let holidays = 0;

    for (const entry of student.attendance) {
      if (!inRange(entry.date, start, end)) continue;

      if (entry.type === "HOURS") {
        sessions += 1;
        hours += entry.hours ?? 0;
        if (wantsMonthlyBreakdown) {
          const fyIndex = FY_MONTH_ORDER.indexOf(new Date(entry.date).getMonth());
          if (fyIndex !== -1) monthlyHours[fyIndex] += entry.hours ?? 0;
        }
      } else if (entry.type === "TUTOR_ABSENT") {
        tutorAbsences += 1;
      } else if (entry.type === "STUDENT_ABSENT") {
        studentAbsences += 1;
      } else {
        holidays += 1;
      }
    }

    return {
      studentId: student.id,
      studentName: student.studentName,
      tutorId: student.tutorId,
      tutorName: student.tutorName,
      active: student.active,
      sessions,
      hours: round(hours),
      tutorAbsences,
      studentAbsences,
      holidays,
      goalsMet: student.achievementDates.filter((d) => inRange(d, start, end)).length,
      monthlyHours: monthlyHours.map(round),
    };
  });

  const totals: ReportTotals = {
    students: rows.length,
    studentsWithHours: rows.filter((r) => r.hours > 0).length,
    sessions: rows.reduce((sum, r) => sum + r.sessions, 0),
    hours: round(rows.reduce((sum, r) => sum + r.hours, 0)),
    tutorAbsences: rows.reduce((sum, r) => sum + r.tutorAbsences, 0),
    studentAbsences: rows.reduce((sum, r) => sum + r.studentAbsences, 0),
    holidays: rows.reduce((sum, r) => sum + r.holidays, 0),
    goalsMet: rows.reduce((sum, r) => sum + r.goalsMet, 0),
    monthlyHours: Array.from({ length: 12 }, (_, i) =>
      round(rows.reduce((sum, r) => sum + (r.monthlyHours[i] ?? 0), 0))
    ),
  };

  const byTutor = new Map<string, ReportData["tutorSubtotals"][number]>();
  for (const row of rows) {
    const existing = byTutor.get(row.tutorId) ?? {
      tutorId: row.tutorId,
      tutorName: row.tutorName,
      students: 0,
      hours: 0,
      sessions: 0,
    };
    existing.students += 1;
    existing.hours = round(existing.hours + row.hours);
    existing.sessions += row.sessions;
    byTutor.set(row.tutorId, existing);
  }

  return {
    period,
    periodLabel: periodLabel(period),
    rows,
    totals,
    tutorSubtotals: Array.from(byTutor.values()).sort((a, b) =>
      a.tutorName.localeCompare(b.tutorName)
    ),
  };
}

export interface MonthMatrixRow {
  studentId: string;
  studentName: string;
  /** One entry per day of the month (index 0 = the 1st); "" when nothing logged. */
  cells: string[];
  total: number;
}

/**
 * A month's attendance as one spreadsheet: students down the side, days of the
 * month across. This is the view staff want attached to a monthly report.
 */
export function buildMonthMatrix(
  students: ReportStudentInput[],
  year: number,
  monthIndex: number
): { rows: MonthMatrixRow[]; daysInMonth: number; dayTotals: number[]; grandTotal: number } {
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const dayTotals = Array(days).fill(0);

  const rows = students.map((student) => {
    const cells: string[] = Array(days).fill("");
    let total = 0;

    for (const entry of student.attendance) {
      const date = new Date(entry.date);
      if (date.getFullYear() !== year || date.getMonth() !== monthIndex) continue;

      const dayIndex = date.getDate() - 1;
      cells[dayIndex] = cellDisplay(entry.type, entry.hours);

      if (entry.type === "HOURS") {
        total += entry.hours ?? 0;
        dayTotals[dayIndex] += entry.hours ?? 0;
      }
    }

    return {
      studentId: student.id,
      studentName: student.studentName,
      cells,
      total: round(total),
    };
  });

  return {
    rows,
    daysInMonth: days,
    dayTotals: dayTotals.map(round),
    grandTotal: round(dayTotals.reduce((a, b) => a + b, 0)),
  };
}
