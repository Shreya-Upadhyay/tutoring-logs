"use client";

import { useEffect, useRef, useState } from "react";

export interface MultiSelectOption {
  id: string;
  name: string;
}

/**
 * Checkbox dropdown for filters that accept several values. An empty selection
 * means "all", which keeps the URL short and the default obvious.
 */
export default function MultiSelect({
  label,
  allLabel,
  options,
  selected,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking elsewhere, so the panel doesn't linger over the report.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
      ? options.find((o) => o.id === selected[0])?.name ?? "1 selected"
      : `${selected.length} selected`;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="label" htmlFor={`${label}-button`}>
        {label}
      </label>
      <button
        id={`${label}-button`}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-auto min-w-[10rem] items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{summary}</span>
        <span className="text-slate-400">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm ${
              selected.length === 0
                ? "bg-brand-50 font-medium text-brand-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {allLabel}
          </button>

          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-slate-400">Nothing to choose from.</p>
          ) : (
            options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={selected.includes(option.id)}
                  onChange={() => toggle(option.id)}
                />
                <span className="truncate text-slate-700">{option.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
