"use client";

import { useState } from "react";
import { downloadStudentProfilePdf, type StudentPdfDetails } from "@/lib/pdf";
import { buildAttendanceGrid, type FlatAttendanceEntry } from "@/lib/attendanceGrid";
import { fiscalYearsFromDates } from "@/lib/fiscalYear";
import { toAchievementPdfRows, type AchievementRecordLike } from "@/lib/achievementsPdfData";

/**
 * The whole student record in one document: details, the attendance grid for a
 * chosen fiscal year, and the achievement checklist.
 */
export default function StudentRecordPdfButton({
  details,
  entries,
  achievements,
}: {
  details: StudentPdfDetails;
  entries: FlatAttendanceEntry[];
  achievements: AchievementRecordLike[];
}) {
  const fyOptions = fiscalYearsFromDates(entries.map((e) => new Date(e.date)));
  const [fy, setFy] = useState(fyOptions[0]);
  const activeFy = fyOptions.includes(fy) ? fy : fyOptions[0];

  return (
    <div className="flex items-center gap-2">
      {fyOptions.length > 1 && (
        <select
          aria-label="Fiscal year for the full record"
          className="input w-auto py-1.5 text-xs"
          value={activeFy}
          onChange={(e) => setFy(e.target.value)}
        >
          {fyOptions.map((y) => (
            <option key={y} value={y}>
              FY {y}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="btn-primary"
        onClick={() =>
          downloadStudentProfilePdf({
            details,
            fyLabel: activeFy,
            grid: buildAttendanceGrid(entries, activeFy),
            achievements: toAchievementPdfRows(achievements),
          })
        }
      >
        Download full record (PDF)
      </button>
    </div>
  );
}
