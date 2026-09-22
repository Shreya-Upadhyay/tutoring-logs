// Primitives shared by the student PDFs and the program reports.
import type jsPDF from "jspdf";

export const BRAND: [number, number, number] = [47, 99, 245];
export const MARGIN = 40;
export const MUTED: [number, number, number] = [71, 85, 105];

/** Y position after the last autoTable, or `fallback` if none was drawn. */
export function lastY(doc: jsPDF, fallback: number): number {
  const table = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return table?.finalY ?? fallback;
}

/** Org name plus a subtitle; returns the y position of the subtitle. */
export function renderHeading(doc: jsPDF, subtitle: string): number {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Literacy Volunteers of America, Essex/Passaic County", MARGIN, 36);
  doc.setFontSize(11);
  doc.text(subtitle, MARGIN, 54);
  doc.setFont("helvetica", "normal");
  return 54;
}

export function fileSafe(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "_");
}
