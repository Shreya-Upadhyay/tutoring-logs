"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { downloadReportPdf, type ReportStudentSection } from "@/lib/reportPdf";
import type { ReportData, ReportStudentInput } from "@/lib/reports";
import MultiSelect from "@/components/MultiSelect";

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
    for (const [key, value] of Object.entries(changes)) {
      // An empty value means "no filter", so drop it rather than carrying
      // an empty parameter around in the URL.
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/reports?${next.toString()}`);
  }

  const selectedIds = (key: string) =>
    (params.get(key) ?? "").split(",").filter(Boolean);

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

      {tutorOptions && (
        <MultiSelect
          label="Tutors"
          allLabel={`All tutors (${tutorOptions.length})`}
          options={tutorOptions}
          selected={selectedIds("tutors")}
          onChange={(ids) => update({ tutors: ids.join(","), students: "" })}
        />
      )}

      {studentOptions.length > 0 && (
        <MultiSelect
          label="Students"
          allLabel={`All students (${studentOptions.length})`}
          options={studentOptions}
          selected={selectedIds("students")}
          onChange={(ids) => update({ students: ids.join(",") })}
        />
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
