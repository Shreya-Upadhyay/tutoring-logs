import { cookies } from "next/headers";

// This app uses a lightweight, no-password "profile picker" instead of full
// authentication: a tutor picks/creates their name once and their id is
// remembered in a cookie. This is intentionally simple for a small internal
// team tool — anyone with the link can see all tutors' students. If LVAEP
// later needs per-tutor data isolation or real accounts, swap this file for
// a proper auth solution (e.g. NextAuth) without touching the rest of the app.

export const TUTOR_COOKIE = "lvaep_tutor_id";

export function getCurrentTutorId(): string | null {
  return cookies().get(TUTOR_COOKIE)?.value ?? null;
}

export function setTutorCookie(tutorId: string): void {
  cookies().set(TUTOR_COOKIE, tutorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

export function clearTutorCookie(): void {
  cookies().delete(TUTOR_COOKIE);
}
