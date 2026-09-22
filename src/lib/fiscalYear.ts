// Reporting runs on a July-June fiscal year (e.g. "FY 2026-2027" = Jul 2026
// through Jun 2027). These helpers lay out the on-screen and PDF attendance
// grids by that year.

export const FY_MONTH_ORDER = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5]; // Jul..Jun (0-indexed JS months)
export const FY_MONTH_LABELS = [
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
];

/** Given a date, return the fiscal-year label it falls in, e.g. "2026-2027". */
export function fiscalYearOf(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0=Jan
  const startYear = m >= 6 ? y : y - 1; // July (6) or later starts the FY
  return `${startYear}-${startYear + 1}`;
}

export function fiscalYearStartYear(fyLabel: string): number {
  return parseInt(fyLabel.split("-")[0], 10);
}

/** All fiscal years present among the given dates, most recent first. */
export function fiscalYearsFromDates(dates: Date[]): string[] {
  const set = new Set(dates.map(fiscalYearOf));
  if (set.size === 0) set.add(fiscalYearOf(new Date()));
  return Array.from(set).sort().reverse();
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** Format a Date as a stable local yyyy-mm-dd key (avoids UTC-shift bugs). */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
