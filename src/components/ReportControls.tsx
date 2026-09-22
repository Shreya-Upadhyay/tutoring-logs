"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { downloadReportPdf, type ReportStudentSection } from "@/lib/reportPdf";
import type { ReportData, ReportStudentInput } from "@/lib/reports";

export default function ReportControls({
  report,
  scopeLabel,
  fiscalYears,
  tutorOptions,
  studentOptions,
  sections,
  studentInputs,
}: {
  report: ReportData;
  scopeLabel: string;
  fiscalYears: string[];
  /** Staff only: lets the report be narrowed to one tutor. */
  tutorOptions: { id: string; name: string }[] | null;
  /** Every student in scope, for the "one student only" choice. */
  studentOptions: { id: string; name: string }[];
  sections: ReportStudentSection[];
  studentInputs: ReportStudentInput[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const kind = report.period.kind;
  const monthValue =
    report.period.kind === "month"
      ? format(new Date(report.period.year, report.period.monthIndex, 1), "yyyy-MM")
      : format(new Date(), "yyyy-MM");
  const fyValue = report.period.kind === "year" ? report.period.fiscalYear : fiscalYears[0];

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    router.push(`/reports?${next.toString()}`);
  }

  return (
    <div className="card mb-6 flex flex-wrap items-end gap-4 p-4">
      <div>
        <label className="label">Report type</label>
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => update({ type: "month", month: monthValue })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              kind === "month" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => update({ type: "year", fy: fyValue })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              kind === "year" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {kind === "month" ? (
        <div>
          <label className="label" htmlFor="month">
            Month
          </label>
          <input
            id="month"
            type="month"
            className="input w-auto"
            value={monthValue}
            onChange={(e) => e.target.value && update({ type: "month", month: e.target.value })}
          />
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="fy">
            Fiscal year
          </label>
          <select
            id="fy"
            className="input w-auto"
            value={fyValue}
            onChange={(e) => update({ type: "year", fy: e.target.value })}
          >
            {fiscalYears.map((fy) => (
              <option key={fy} value={fy}>
                FY {fy} (Jul–Jun)
              </option>
            ))}
          </select>
        </div>
      )}

      {studentOptions.length > 1 && (
        <div>
          <label className="label" htmlFor="student">
            Students
          </label>
          <select
            id="student"
            className="input w-auto"
            value={params.get("student") ?? "all"}
            onChange={(e) => update({ student: e.target.value })}
          >
            <option value="all">All students ({studentOptions.length})</option>
            {studentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} only
              </option>
            ))}
          </select>
        </div>
      )}

      {tutorOptions && (
        <div>
          <label className="label" htmlFor="tutor">
            Tutor
          </label>
          <select
            id="tutor"
            className="input w-auto"
            value={params.get("tutor") ?? "all"}
            onChange={(e) => update({ tutor: e.target.value })}
          >
            <option value="all">All tutors</option>
            {tutorOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        className="btn-primary ml-auto"
        onClick={() => downloadReportPdf({ report, scopeLabel, sections, studentInputs })}
      >
        Download report (PDF)
      </button>
    </div>
  );
}
