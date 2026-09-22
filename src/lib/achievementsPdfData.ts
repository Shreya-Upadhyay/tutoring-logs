import { ACHIEVEMENT_CATALOG, OTHER_CATEGORY } from "@/lib/achievementCatalog";
import type { AchievementForPdf } from "@/lib/pdf";

export interface AchievementRecordLike {
  itemKey: string;
  label: string;
  category: string;
  attained: boolean;
  attainedAt: string | null;
}

/**
 * Orders a student's achievement records the way they appear on screen —
 * catalog categories in order, then any free-text "Other" entries — and
 * attaches the category/starred metadata the PDF needs.
 */
export function toAchievementPdfRows(records: AchievementRecordLike[]): AchievementForPdf[] {
  const byKey = new Map(records.map((r) => [r.itemKey, r]));
  const rows: AchievementForPdf[] = [];

  for (const category of ACHIEVEMENT_CATALOG) {
    for (const item of category.items) {
      const record = byKey.get(item.key);
      rows.push({
        categoryLetter: category.letter,
        categoryTitle: category.title,
        label: item.label,
        starred: item.starred,
        attained: record?.attained ?? false,
        attainedAt: record?.attainedAt ?? null,
      });
    }
  }

  for (const record of records.filter((r) => r.category === "OTHER")) {
    rows.push({
      categoryLetter: OTHER_CATEGORY.letter,
      categoryTitle: OTHER_CATEGORY.title,
      label: record.label,
      starred: false,
      attained: record.attained,
      attainedAt: record.attainedAt,
    });
  }

  return rows;
}
