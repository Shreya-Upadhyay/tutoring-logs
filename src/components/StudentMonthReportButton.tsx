"use client";

import { useState } from "react";
import { format } from "date-fns";
import { downloadReportPdf } from "@/lib/reportPdf";
import { buildReport, type ReportStudentInput } from "@/lib/reports";
import type { FlatAttendanceEntry } from "@/lib/attendanceGrid";
import type { AchievementForPdf } from "@/lib/pdf";

/**
 * A monthly report for this student alone, generated from the same aggregation
 * the program-wide reports use — so the figures agree with what staff see.
 */
export default function StudentMonthReportButton({
  studentId,
  studentName,
  tutorName,
  entries,
  achievements,
}: {
  studentId: string;
  studentName: string;
  tutorName: string;
  entries: FlatAttendanceEntry[];
  achievements: AchievementForPdf[];
}) {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));

  function download() {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) return;

    const input: ReportStudentInput = {
      id: studentId,
      studentName,
      tutorId: "self",
      tutorName,
      active: true,
      attendance: entries,
      achievementDates: achievements
        .filter((a) => a.attained)
        .map((a) => a.attainedAt),
    };

    const report = buildReport([input], {
      kind: "month",
      year: Number(match[1]),
      monthIndex: Number(match[2]) - 1,
    });

    downloadReportPdf({
      report,
      scopeLabel: `${studentName} — tutored by ${tutorName}`,
      sections: [{ studentId, studentName, tutorName, entries, achievements }],
      studentInputs: [input],
    });
  }

  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="label text-xs" htmlFor="month-report">
          Month report
        </label>
        <input
          id="month-report"
          type="month"
          className="input w-auto py-1.5 text-xs"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>
      <button type="button" className="btn-secondary" onClick={download}>
        Download month (PDF)
      </button>
    </div>
  );
}
