import { FY_MONTH_ORDER, FY_MONTH_LABELS, fiscalYearStartYear, daysInMonth } from "@/lib/fiscalYear";

export interface FlatAttendanceEntry {
  date: string; // ISO
  type: "HOURS" | "TUTOR_ABSENT" | "STUDENT_ABSENT" | "HOLIDAY";
  hours: number | null;
}

const CODE: Record<FlatAttendanceEntry["type"], string> = {
  HOURS: "",
  TUTOR_ABSENT: "TA",
  STUDENT_ABSENT: "SA",
  HOLIDAY: "H",
};

export interface AttendanceGridResult {
  monthLabels: string[];
  /** cells[dayIndex][monthIndex] -> display string ("" if no entry that day) */
  cells: string[][];
  /** total hours per month (HOURS entries only) */
  monthTotals: number[];
  grandTotal: number;
}

/** Build the Jul-Jun x 1-31 grid for one fiscal year, matching the paper form. */
export function buildAttendanceGrid(
  entries: FlatAttendanceEntry[],
  fyLabel: string
): AttendanceGridResult {
  const startYear = fiscalYearStartYear(fyLabel);
  const cells: string[][] = Array.from({ length: 31 }, () => Array(12).fill(""));
  const monthTotals = Array(12).fill(0);

  for (const entry of entries) {
    const d = new Date(entry.date);
    const calYear = d.getFullYear();
    const calMonth = d.getMonth(); // 0-indexed
    const day = d.getDate();

    const fyMonthIndex = FY_MONTH_ORDER.indexOf(calMonth);
    if (fyMonthIndex === -1) continue;
    const expectedCalYear = calMonth >= 6 ? startYear : startYear + 1;
    if (calYear !== expectedCalYear) continue;

    const display = entry.type === "HOURS" ? String(entry.hours ?? "") : CODE[entry.type];
    cells[day - 1][fyMonthIndex] = display;

    if (entry.type === "HOURS" && entry.hours) {
      monthTotals[fyMonthIndex] += entry.hours;
    }
  }

  // Blank out days that don't exist in a given month (e.g. Feb 30).
  for (let m = 0; m < 12; m++) {
    const calMonth = FY_MONTH_ORDER[m];
    const calYear = calMonth >= 6 ? startYear : startYear + 1;
    const validDays = daysInMonth(calYear, calMonth);
    for (let day = validDays; day < 31; day++) {
      cells[day][m] = cells[day][m] || "—"; // em dash for N/A days
    }
  }

  const grandTotal = Math.round(monthTotals.reduce((a, b) => a + b, 0) * 100) / 100;

  return {
    monthLabels: FY_MONTH_LABELS,
    cells,
    monthTotals: monthTotals.map((t) => Math.round(t * 100) / 100),
    grandTotal,
  };
}
