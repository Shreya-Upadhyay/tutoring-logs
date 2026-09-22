import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format as formatDate } from "date-fns";
import { BRAND, MARGIN, MUTED, lastY, renderHeading, fileSafe } from "@/lib/pdfShared";
import { FY_MONTH_LABELS } from "@/lib/fiscalYear";
import { buildMonthMatrix, type ReportData, type ReportStudentInput } from "@/lib/reports";
import { buildAttendanceGrid, type FlatAttendanceEntry } from "@/lib/attendanceGrid";
import { ATTENDANCE_TYPES, ATTENDANCE_TYPE_LIST, typeFromCode } from "@/lib/attendanceTypes";
import { renderAttendanceTable, renderAchievementsTable, type AchievementForPdf } from "@/lib/pdf";

/** Everything needed to append a student's own attendance and goals pages. */
export interface ReportStudentSection {
  studentId: string;
  studentName: string;
  tutorName: string;
  entries: FlatAttendanceEntry[];
  achievements: AchievementForPdf[];
}

export function downloadReportPdf(opts: {
  report: ReportData;
  scopeLabel: string;
  /** Per-student attendance + goals pages, already scoped to the chosen students. */
  sections?: ReportStudentSection[];
  /** Raw inputs, used to build the month attendance spreadsheet. */
  studentInputs?: ReportStudentInput[];
}) {
  const { report, scopeLabel, sections = [], studentInputs = [] } = opts;
  const isYearly = report.period.kind === "year";
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  const kind = isYearly ? "Annual Report" : "Monthly Report";
  renderHeading(doc, `${kind} — ${report.periodLabel}`);

  doc.setFontSize(10);
  doc.text(scopeLabel, MARGIN, 74);
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text(`Generated ${formatDate(new Date(), "MMM d, yyyy")}`, MARGIN, 88);
  doc.setTextColor(0, 0, 0);

  // Program-level figures first, since that is what gets reported upward.
  autoTable(doc, {
    body: [
      [
        "Students served",
        String(report.totals.studentsWithHours),
        "Sessions",
        String(report.totals.sessions),
        "Total hours",
        String(report.totals.hours),
        "Goals met",
        String(report.totals.goalsMet),
      ],
    ],
    startY: 100,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 5, halign: "center" },
    columnStyles: {
      0: { fontStyle: "bold", textColor: MUTED },
      2: { fontStyle: "bold", textColor: MUTED },
      4: { fontStyle: "bold", textColor: MUTED },
      6: { fontStyle: "bold", textColor: MUTED },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  let y = lastY(doc, 100) + 24;

  // Per-tutor subtotals, only meaningful when the report spans several tutors.
  if (report.tutorSubtotals.length > 1) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("By tutor", MARGIN, y);
    doc.setFont("helvetica", "normal");

    autoTable(doc, {
      head: [["Tutor", "Students", "Sessions", "Hours"]],
      body: report.tutorSubtotals.map((t) => [
        t.tutorName,
        String(t.students),
        String(t.sessions),
        String(t.hours),
      ]),
      startY: y + 8,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: BRAND },
      columnStyles: {
        1: { halign: "center", cellWidth: 70 },
        2: { halign: "center", cellWidth: 70 },
        3: { halign: "center", cellWidth: 70 },
      },
      margin: { left: MARGIN, right: MARGIN },
    });

    y = lastY(doc, y) + 24;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("By student", MARGIN, y);
  doc.setFont("helvetica", "normal");

  const head = isYearly
    ? [["Student", "Tutor", ...FY_MONTH_LABELS, "Hours", "Goals"]]
    : [["Student", "Tutor", "Sessions", "Hours", "TA", "SA", "H", "Goals"]];

  const body = report.rows.map((row) =>
    isYearly
      ? [
          row.studentName,
          row.tutorName,
          ...row.monthlyHours.map((h) => (h ? String(h) : "")),
          String(row.hours),
          row.goalsMet ? String(row.goalsMet) : "",
        ]
      : [
          row.studentName,
          row.tutorName,
          String(row.sessions),
          String(row.hours),
          row.tutorAbsences ? String(row.tutorAbsences) : "",
          row.studentAbsences ? String(row.studentAbsences) : "",
          row.holidays ? String(row.holidays) : "",
          row.goalsMet ? String(row.goalsMet) : "",
        ]
  );

  body.push(
    isYearly
      ? [
          "Total",
          "",
          ...report.totals.monthlyHours.map((h) => (h ? String(h) : "")),
          String(report.totals.hours),
          String(report.totals.goalsMet),
        ]
      : [
          "Total",
          "",
          String(report.totals.sessions),
          String(report.totals.hours),
          String(report.totals.tutorAbsences),
          String(report.totals.studentAbsences),
          String(report.totals.holidays),
          String(report.totals.goalsMet),
        ]
  );

  const totalRowIndex = body.length - 1;

  autoTable(doc, {
    head,
    body,
    startY: y + 8,
    styles: { fontSize: isYearly ? 8 : 9, cellPadding: 4, halign: "center" },
    headStyles: { fillColor: BRAND },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: isYearly ? 110 : 150 },
      1: { halign: "left", cellWidth: isYearly ? 90 : 130 },
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === totalRowIndex) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [238, 244, 255];
      }
    },
  });

  if (!isYearly) {
    const afterTable = lastY(doc, y);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "TA = Tutor Absent   SA = Student Absent   H = Holiday",
      MARGIN,
      afterTable + 16
    );
    doc.setTextColor(0, 0, 0);
  }

  // --- Attendance spreadsheet for the month (students down, days across) ---
  if (report.period.kind === "month" && studentInputs.length > 0) {
    const matrix = buildMonthMatrix(
      studentInputs,
      report.period.year,
      report.period.monthIndex
    );

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Attendance — ${report.periodLabel}`, MARGIN, 40);
    doc.setFont("helvetica", "normal");

    const dayHeaders = Array.from({ length: matrix.daysInMonth }, (_, i) => String(i + 1));
    const matrixBody: string[][] = matrix.rows.map((row) => [
      row.studentName,
      ...row.cells,
      row.total ? String(row.total) : "",
    ]);
    matrixBody.push([
      "Total",
      ...matrix.dayTotals.map((t) => (t ? String(t) : "")),
      String(matrix.grandTotal),
    ]);
    const matrixTotalRow = matrixBody.length - 1;

    autoTable(doc, {
      head: [["Student", ...dayHeaders, "Hours"]],
      body: matrixBody,
      startY: 52,
      styles: { fontSize: 6.5, cellPadding: 1.5, halign: "center", overflow: "hidden" },
      headStyles: { fillColor: BRAND, fontSize: 6.5 },
      columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 92, fontSize: 7 } },
      margin: { left: MARGIN, right: MARGIN },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.row.index === matrixTotalRow) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [238, 244, 255];
          return;
        }
        if (data.column.index === 0) return;
        const type = typeFromCode(String(data.cell.raw ?? ""));
        if (type) {
          data.cell.styles.fillColor = ATTENDANCE_TYPES[type].pdfFill;
          data.cell.styles.textColor = ATTENDANCE_TYPES[type].pdfText;
          if (type !== "HOURS") data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const afterMatrix = lastY(doc, 52);
    doc.setFontSize(8);
    let legendX = MARGIN;
    for (const type of ATTENDANCE_TYPE_LIST) {
      doc.setFillColor(...type.pdfFill);
      doc.rect(legendX, afterMatrix + 10, 8, 8, "F");
      doc.setTextColor(...MUTED);
      const label = type.key === "HOURS" ? "Hours tutored" : type.label;
      doc.text(label, legendX + 12, afterMatrix + 17);
      legendX += doc.getTextWidth(label) + 34;
    }
    doc.setTextColor(0, 0, 0);
  }

  // --- Per-student pages: the attendance grid (yearly) and the goals checklist ---
  for (const section of sections) {
    if (report.period.kind === "year") {
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${section.studentName} — Attendance FY ${report.period.fiscalYear}`, MARGIN, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(`Tutor: ${section.tutorName}`, MARGIN, 54);
      doc.setTextColor(0, 0, 0);

      renderAttendanceTable(doc, buildAttendanceGrid(section.entries, report.period.fiscalYear), 66);
    }

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${section.studentName} — Goals`, MARGIN, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Tutor: ${section.tutorName}`, MARGIN, 54);
    doc.setTextColor(0, 0, 0);

    renderAchievementsTable(doc, section.achievements, 66);
  }

  const periodSlug =
    report.period.kind === "month"
      ? formatDate(new Date(report.period.year, report.period.monthIndex, 1), "yyyy-MM")
      : `FY${report.period.fiscalYear}`;

  doc.save(`LVAEP_${isYearly ? "annual" : "monthly"}_report_${fileSafe(periodSlug)}.pdf`);
}
