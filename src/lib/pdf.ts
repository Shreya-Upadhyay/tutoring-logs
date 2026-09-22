import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format as formatDate } from "date-fns";
import type { AttendanceGridResult } from "@/lib/attendanceGrid";
import { ATTENDANCE_TYPES, ATTENDANCE_TYPE_LIST, typeFromCode } from "@/lib/attendanceTypes";

const BRAND: [number, number, number] = [47, 99, 245];
const MARGIN = 40;

export interface AchievementForPdf {
  categoryLetter: string;
  categoryTitle: string;
  label: string;
  starred: boolean;
  attained: boolean;
  attainedAt: string | null;
}

export interface StudentPdfDetails {
  studentName: string;
  tutorName: string;
  site: string | null;
  days: string | null;
  times: string | null;
  active: boolean;
  stoppedReason: string | null;
}

function lastY(doc: jsPDF, fallback: number): number {
  const table = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return table?.finalY ?? fallback;
}

function renderHeading(doc: jsPDF, subtitle: string): number {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Literacy Volunteers of America, Essex/Passaic County", MARGIN, 36);
  doc.setFontSize(11);
  doc.text(subtitle, MARGIN, 54);
  doc.setFont("helvetica", "normal");
  return 54;
}

function renderDetails(doc: jsPDF, details: StudentPdfDetails, startY: number): number {
  const rows: string[][] = [
    ["Student", details.studentName],
    ["Tutor", details.tutorName],
    ["Tutoring site", details.site ?? "—"],
    ["Day(s)", details.days ?? "—"],
    ["Time(s)", details.times ?? "—"],
    [
      "Status",
      details.active
        ? "Currently being tutored"
        : `No longer being tutored${details.stoppedReason ? ` — ${details.stoppedReason}` : ""}`,
    ],
  ];

  autoTable(doc, {
    body: rows,
    startY: startY + 16,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 110, textColor: [71, 85, 105] } },
    margin: { left: MARGIN, right: MARGIN },
  });

  return lastY(doc, startY + 16);
}

function renderSummary(
  doc: jsPDF,
  grid: AttendanceGridResult,
  achievements: AchievementForPdf[],
  startY: number
): number {
  const sessions = grid.cells.flat().filter((cell) => {
    const type = typeFromCode(cell);
    return type === "HOURS";
  }).length;
  const absences = grid.cells.flat().filter((cell) => {
    const type = typeFromCode(cell);
    return type !== null && type !== "HOURS";
  }).length;
  const attained = achievements.filter((a) => a.attained).length;

  autoTable(doc, {
    body: [
      ["Total hours tutored", String(grid.grandTotal)],
      ["Sessions logged", String(sessions)],
      ["Absences / holidays", String(absences)],
      ["Achievements attained", `${attained} of ${achievements.length}`],
    ],
    startY: startY + 16,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 140, textColor: [71, 85, 105] } },
    margin: { left: MARGIN, right: MARGIN },
  });

  return lastY(doc, startY + 16);
}

function renderAttendanceTable(
  doc: jsPDF,
  grid: AttendanceGridResult,
  startY: number
): number {
  const head = [["Day", ...grid.monthLabels]];
  const body: string[][] = grid.cells.map((row, i) => [String(i + 1), ...row]);
  const totalRowIndex = body.length;
  body.push(["Total", ...grid.monthTotals.map((t) => (t ? String(t) : ""))]);

  autoTable(doc, {
    head,
    body,
    startY,
    styles: { fontSize: 8, halign: "center", cellPadding: 3 },
    headStyles: { fillColor: BRAND },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 } },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data) => {
      if (data.section !== "body") return;

      if (data.row.index === totalRowIndex) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [238, 244, 255];
        return;
      }

      // Colour each entry by kind, matching the colours used on screen.
      if (data.column.index === 0) {
        data.cell.styles.fontStyle = "bold";
        return;
      }

      const type = typeFromCode(String(data.cell.raw ?? ""));
      if (type) {
        data.cell.styles.fillColor = ATTENDANCE_TYPES[type].pdfFill;
        data.cell.styles.textColor = ATTENDANCE_TYPES[type].pdfText;
        if (type !== "HOURS") data.cell.styles.fontStyle = "bold";
      }
    },
  });

  let y = lastY(doc, startY);

  doc.setFontSize(9);
  doc.text(`Grand total hours: ${grid.grandTotal}`, MARGIN, y + 20);

  // Colour legend
  y += 34;
  doc.setFontSize(8);
  let x = MARGIN;
  for (const type of ATTENDANCE_TYPE_LIST) {
    doc.setFillColor(...type.pdfFill);
    doc.rect(x, y - 6, 8, 8, "F");
    doc.setTextColor(71, 85, 105);
    const label = type.key === "HOURS" ? "Hours tutored" : type.label;
    doc.text(label, x + 12, y);
    x += doc.getTextWidth(label) + 34;
  }
  doc.setTextColor(0, 0, 0);

  return y;
}

function renderAchievementsTable(
  doc: jsPDF,
  achievements: AchievementForPdf[],
  startY: number
): number {
  const body: (string | { content: string; colSpan?: number; styles?: object })[][] = [];
  let currentCategory = "";

  for (const achievement of achievements) {
    const categoryKey = `${achievement.categoryLetter}. ${achievement.categoryTitle}`;
    if (categoryKey !== currentCategory) {
      currentCategory = categoryKey;
      body.push([
        {
          content: categoryKey,
          colSpan: 3,
          styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [30, 41, 59] },
        },
      ]);
    }

    body.push([
      achievement.attained ? "Yes" : "",
      `${achievement.starred ? "* " : ""}${achievement.label}`,
      achievement.attainedAt ? formatDate(new Date(achievement.attainedAt), "MMM d, yyyy") : "",
    ]);
  }

  autoTable(doc, {
    head: [["Attained", "Goal", "Date"]],
    body,
    startY,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: BRAND },
    columnStyles: {
      0: { cellWidth: 60, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 80, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0 && data.cell.raw === "Yes") {
        data.cell.styles.fillColor = ATTENDANCE_TYPES.HOURS.pdfFill;
        data.cell.styles.textColor = ATTENDANCE_TYPES.HOURS.pdfText;
      }
    },
  });

  const y = lastY(doc, startY);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("* Core outcome measure.", MARGIN, y + 16);
  doc.setTextColor(0, 0, 0);

  return y + 16;
}

function fileSafe(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "_");
}

/** Attendance grid for one fiscal year. */
export function downloadAttendancePdf(opts: {
  details: StudentPdfDetails;
  fyLabel: string;
  grid: AttendanceGridResult;
}) {
  const { details, fyLabel, grid } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  renderHeading(doc, `Attendance Record — FY ${fyLabel}`);
  doc.setFontSize(10);
  doc.text(`Tutor: ${details.tutorName}`, MARGIN, 74);
  doc.text(`Student: ${details.studentName}`, 260, 74);
  doc.text(`Tutoring Site: ${details.site ?? "—"}`, 480, 74);

  renderAttendanceTable(doc, grid, 90);
  doc.save(`${fileSafe(details.studentName)}_attendance_FY${fyLabel}.pdf`);
}

/** Achievement checklist on its own. */
export function downloadAchievementsPdf(opts: {
  details: StudentPdfDetails;
  achievements: AchievementForPdf[];
}) {
  const { details, achievements } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  renderHeading(doc, "Student Achievement Record");
  doc.setFontSize(10);
  doc.text(`Tutor: ${details.tutorName}`, MARGIN, 74);
  doc.text(`Student: ${details.studentName}`, 300, 74);

  renderAchievementsTable(doc, achievements, 90);
  doc.save(`${fileSafe(details.studentName)}_achievements.pdf`);
}

/** Everything on one document: details, attendance grid, achievements. */
export function downloadStudentProfilePdf(opts: {
  details: StudentPdfDetails;
  fyLabel: string;
  grid: AttendanceGridResult;
  achievements: AchievementForPdf[];
}) {
  const { details, fyLabel, grid, achievements } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  const headingY = renderHeading(doc, `Student Record — FY ${fyLabel}`);
  const detailsY = renderDetails(doc, details, headingY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Summary", MARGIN, detailsY + 26);
  doc.setFont("helvetica", "normal");
  renderSummary(doc, grid, achievements, detailsY + 26);

  // The attendance grid is 31 rows tall, so it gets a page of its own rather
  // than being split across a page break.
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Attendance — FY ${fyLabel}`, MARGIN, 40);
  doc.setFont("helvetica", "normal");
  renderAttendanceTable(doc, grid, 52);

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Achievements", MARGIN, 40);
  doc.setFont("helvetica", "normal");
  renderAchievementsTable(doc, achievements, 52);

  doc.save(`${fileSafe(details.studentName)}_full_record_FY${fyLabel}.pdf`);
}
