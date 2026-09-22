import { redirect } from "next/navigation";

/** Kept so older bookmarks still land somewhere useful. */
export default function OnboardingPage() {
  redirect("/login");
}
