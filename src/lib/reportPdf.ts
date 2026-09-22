import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format as formatDate } from "date-fns";
import { BRAND, MARGIN, MUTED, lastY, renderHeading, fileSafe } from "@/lib/pdfShared";
import { FY_MONTH_LABELS } from "@/lib/fiscalYear";
import type { ReportData } from "@/lib/reports";

export function downloadReportPdf(opts: { report: ReportData; scopeLabel: string }) {
  const { report, scopeLabel } = opts;
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

  const periodSlug =
    report.period.kind === "month"
      ? formatDate(new Date(report.period.year, report.period.monthIndex, 1), "yyyy-MM")
      : `FY${report.period.fiscalYear}`;

  doc.save(`LVAEP_${isYearly ? "annual" : "monthly"}_report_${fileSafe(periodSlug)}.pdf`);
}
