// The achievement goals LVAEP tracks, by category. Starred items are the
// federally-reportable core outcome measures.

export type CategoryKey = "ECONOMIC" | "EDUCATIONAL" | "FAMILY" | "SOCIETAL";

export interface CatalogItem {
  key: string;
  label: string;
  starred: boolean;
}

export interface CatalogCategory {
  key: CategoryKey;
  letter: string;
  title: string;
  items: CatalogItem[];
}

export const ACHIEVEMENT_CATALOG: CatalogCategory[] = [
  {
    key: "ECONOMIC",
    letter: "A",
    title: "Economic",
    items: [
      { key: "econ_1", label: "Enter Employment", starred: true },
      { key: "econ_2", label: "Retain Employment", starred: true },
      { key: "econ_3", label: "Leave public assistance", starred: false },
    ],
  },
  {
    key: "EDUCATIONAL",
    letter: "B",
    title: "Educational",
    items: [
      { key: "edu_1", label: "Achieve work-based project learner goal", starred: false },
      { key: "edu_2", label: "Enter Occupational Skills Training Program", starred: true },
      { key: "edu_3", label: "Enter Postsecondary Education", starred: true },
      { key: "edu_4", label: "Obtain High School Diploma", starred: true },
    ],
  },
  {
    key: "FAMILY",
    letter: "C",
    title: "Family",
    items: [
      { key: "fam_1", label: "Help more frequently with school", starred: false },
      { key: "fam_2", label: "Increase contact with child(ren)'s teachers", starred: false },
      { key: "fam_3", label: "More involvement in child(ren)'s school activities", starred: false },
      { key: "fam_4", label: "Purchase books or magazines", starred: false },
      { key: "fam_5", label: "Read to child(ren)", starred: false },
      { key: "fam_6", label: "Visit the library (with/for child(ren))", starred: false },
    ],
  },
  {
    key: "SOCIETAL",
    letter: "D",
    title: "Societal/Community",
    items: [
      { key: "soc_1", label: "Obtain citizenship", starred: true },
      { key: "soc_2", label: "Achieve civics skills", starred: false },
      { key: "soc_3", label: "Increase involvement in community activities", starred: false },
      { key: "soc_4", label: "Vote or register to vote", starred: false },
    ],
  },
];

export const OTHER_CATEGORY = { key: "OTHER" as const, letter: "E", title: "Other(s)" };
