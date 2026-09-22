// One source of truth for how each kind of attendance entry is labelled and
// coloured, so the calendar, the grid, the entry form, the legend and the PDFs
// can never drift apart.

export type AttendanceTypeKey = "HOURS" | "TUTOR_ABSENT" | "STUDENT_ABSENT" | "HOLIDAY";

export interface AttendanceTypeMeta {
  key: AttendanceTypeKey;
  /** Short code shown in grid cells, matching the codes staff already use. */
  code: string;
  /** Full label for menus and legends. */
  label: string;
  /** Tailwind classes for a filled cell/day. */
  cellClass: string;
  /** Tailwind classes for the small legend swatch. */
  swatchClass: string;
  /** Cell fill for PDF tables, as RGB. */
  pdfFill: [number, number, number];
  /** Text colour for PDF tables, as RGB. */
  pdfText: [number, number, number];
}

export const ATTENDANCE_TYPES: Record<AttendanceTypeKey, AttendanceTypeMeta> = {
  HOURS: {
    key: "HOURS",
    code: "",
    label: "Hours tutored",
    cellClass: "bg-emerald-100 text-emerald-900",
    swatchClass: "bg-emerald-400",
    pdfFill: [209, 250, 229],
    pdfText: [6, 78, 59],
  },
  TUTOR_ABSENT: {
    key: "TUTOR_ABSENT",
    code: "TA",
    label: "TA — Tutor Absent",
    cellClass: "bg-amber-100 text-amber-900",
    swatchClass: "bg-amber-400",
    pdfFill: [254, 243, 199],
    pdfText: [120, 53, 15],
  },
  STUDENT_ABSENT: {
    key: "STUDENT_ABSENT",
    code: "SA",
    label: "SA — Student Absent",
    cellClass: "bg-rose-100 text-rose-900",
    swatchClass: "bg-rose-400",
    pdfFill: [255, 228, 230],
    pdfText: [136, 19, 55],
  },
  HOLIDAY: {
    key: "HOLIDAY",
    code: "H",
    label: "H — Holiday",
    cellClass: "bg-violet-100 text-violet-900",
    swatchClass: "bg-violet-400",
    pdfFill: [237, 233, 254],
    pdfText: [76, 29, 149],
  },
};

export const ATTENDANCE_TYPE_LIST: AttendanceTypeMeta[] = [
  ATTENDANCE_TYPES.HOURS,
  ATTENDANCE_TYPES.TUTOR_ABSENT,
  ATTENDANCE_TYPES.STUDENT_ABSENT,
  ATTENDANCE_TYPES.HOLIDAY,
];

/** What a grid/calendar cell shows: hours as a number, otherwise the code. */
export function cellDisplay(type: AttendanceTypeKey, hours: number | null): string {
  return type === "HOURS" ? String(hours ?? "") : ATTENDANCE_TYPES[type].code;
}

/** Maps a display string from the grid back to its type, for colouring. */
export function typeFromCode(value: string): AttendanceTypeKey | null {
  if (!value || value === "—") return null;
  const match = ATTENDANCE_TYPE_LIST.find((t) => t.code !== "" && t.code === value);
  return match ? match.key : "HOURS";
}
