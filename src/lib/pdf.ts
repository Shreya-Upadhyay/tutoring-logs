import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AttendanceGridResult } from "@/lib/attendanceGrid";

export function downloadAttendancePdf(opts: {
  studentName: string;
  tutorName: string;
  site: string | null;
  fyLabel: string;
  grid: AttendanceGridResult;
}) {
  const { studentName, tutorName, site, fyLabel, grid } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Literacy Volunteers of America, Essex/Passaic County", 40, 36);
  doc.setFontSize(11);
  doc.text(`Student Monthly Attendance Record — FY ${fyLabel}`, 40, 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Tutor: ${tutorName}`, 40, 74);
  doc.text(`Student: ${studentName}`, 260, 74);
  doc.text(`Tutoring Site: ${site ?? "-"}`, 480, 74);

  const head = [["Day", ...grid.monthLabels]];
  const body = grid.cells.map((row, i) => [String(i + 1), ...row]);
  body.push(["Total", ...grid.monthTotals.map((t) => (t ? String(t) : ""))]);

  autoTable(doc, {
    head,
    body,
    startY: 90,
    styles: { fontSize: 8, halign: "center", cellPadding: 3 },
    headStyles: { fillColor: [47, 99, 245] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 } },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [238, 244, 255];
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY ?? 90;
  doc.setFontSize(9);
  doc.text(`Grand total hours: ${grid.grandTotal}`, 40, finalY + 20);
  doc.setFontSize(8);
  doc.text("TA = Tutor Absent   SA = Student Absent   H = Holiday", 40, finalY + 34);

  const fileSafeName = studentName.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${fileSafeName}_attendance_FY${fyLabel}.pdf`);
}
