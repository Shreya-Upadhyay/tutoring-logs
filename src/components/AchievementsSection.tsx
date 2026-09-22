"use client";

import { useState, useTransition } from "react";
import { ACHIEVEMENT_CATALOG, OTHER_CATEGORY, CategoryKey } from "@/lib/achievementCatalog";
import { setAchievementAttained, addOtherAchievement, deleteOtherAchievement } from "@/lib/actions";
import { downloadAchievementsPdf, type StudentPdfDetails } from "@/lib/pdf";
import { toAchievementPdfRows } from "@/lib/achievementsPdfData";

export interface AchievementDTO {
  id: string;
  category: CategoryKey | "OTHER";
  itemKey: string;
  label: string;
  attained: boolean;
  attainedAt: string | null;
}

export default function AchievementsSection({
  studentId,
  details,
  achievements,
  readOnly = false,
}: {
  studentId: string;
  details: StudentPdfDetails;
  achievements: AchievementDTO[];
  /** Staff accounts can read the checklist but not change it. */
  readOnly?: boolean;
}) {
  const [items, setItems] = useState(achievements);
  const [, startTransition] = useTransition();
  const [newOther, setNewOther] = useState("");
  const [addingOther, startAddingOther] = useTransition();

  const byKey = new Map(items.map((a) => [a.itemKey, a]));
  const otherItems = items.filter((a) => a.category === "OTHER");

  function toggle(id: string, currentlyAttained: boolean) {
    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, attained: !currentlyAttained } : a))
    );
    startTransition(async () => {
      try {
        await setAchievementAttained(studentId, id, !currentlyAttained);
      } catch {
        // revert on failure
        setItems((prev) =>
          prev.map((a) => (a.id === id ? { ...a, attained: currentlyAttained } : a))
        );
      }
    });
  }

  function handleAddOther() {
    if (!newOther.trim()) return;
    const fd = new FormData();
    fd.set("label", newOther.trim());
    startAddingOther(async () => {
      await addOtherAchievement(studentId, fd);
      setNewOther("");
      // The parent server component will re-render with fresh data on next
      // navigation; for immediate feedback, optimistically show it locally.
      setItems((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          category: "OTHER",
          itemKey: `other_temp_${Date.now()}`,
          label: newOther.trim(),
          attained: true,
          attainedAt: new Date().toISOString(),
        },
      ]);
    });
  }

  function handleDeleteOther(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id));
    if (!id.startsWith("temp-")) {
      startTransition(async () => {
        await deleteOtherAchievement(studentId, id);
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            downloadAchievementsPdf({ details, achievements: toAchievementPdfRows(items) })
          }
        >
          Download achievements (PDF)
        </button>
      </div>

      {ACHIEVEMENT_CATALOG.map((cat) => (
        <div key={cat.key}>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            {cat.letter}. {cat.title}
          </h3>
          <ul className="space-y-1.5">
            {cat.items.map((item) => {
              const record = byKey.get(item.key);
              const checked = record?.attained ?? false;
              return (
                <li key={item.key}>
                  <label
                    className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      readOnly ? "" : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60"
                      checked={checked}
                      disabled={readOnly}
                      onChange={() => record && toggle(record.id, checked)}
                    />
                    <span className={checked ? "text-slate-500 line-through" : "text-slate-700"}>
                      {item.starred && <span className="mr-0.5 text-brand-600">*</span>}
                      {item.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          {OTHER_CATEGORY.letter}. {OTHER_CATEGORY.title}
        </h3>
        <ul className="mb-2 space-y-1.5">
          {otherItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="h-4 w-4 flex-shrink-0 rounded bg-brand-100 text-center text-[10px] leading-4 text-brand-700">
                  ✓
                </span>
                {item.label}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDeleteOther(item.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className={`flex gap-2 ${readOnly ? "hidden" : ""}`}>
          <input
            className="input"
            placeholder="Describe another achievement..."
            value={newOther}
            onChange={(e) => setNewOther(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddOther();
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary flex-shrink-0"
            disabled={addingOther || !newOther.trim()}
            onClick={handleAddOther}
          >
            Add
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">* Core outcome measure.</p>
    </div>
  );
}
