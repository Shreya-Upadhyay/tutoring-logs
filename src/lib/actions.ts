"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutorId, setTutorCookie, clearTutorCookie } from "@/lib/tutorSession";
import {
  hashPassword,
  verifyPassword,
  normalizeEmail,
  looksLikeEmail,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievementCatalog";
import { AttendanceType } from "@prisma/client";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v.length > 0 ? v : null;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/** The signed-in account id, or off to the login page. */
async function requireEditor(): Promise<string> {
  const id = getCurrentTutorId();
  if (!id) redirect("/login");

  const account = await prisma.tutor.findUnique({
    where: { id: id as string },
    select: { id: true },
  });
  if (!account) redirect("/login");
  return account.id;
}

/**
 * Ownership is what grants write access: a tutor may only touch their own
 * students. Staff visibility is read-only precisely because a staff account
 * does not own other tutors' students. Enforced here rather than only in the
 * UI so a hand-crafted request cannot write either.
 */
async function requireOwnedStudent(studentId: string): Promise<string> {
  const tutorId = await requireEditor();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { tutorId: true },
  });
  if (!student) throw new Error("That student no longer exists.");
  if (student.tutorId !== tutorId) {
    throw new Error("That student belongs to a different tutor.");
  }
  return tutorId;
}

// ---------- Registration and sign-in ----------

/** Creates a new account. Separate from logging in to an existing one. */
export async function signUp(formData: FormData): Promise<ActionResult> {
  const firstName = str(formData, "firstName");
  if (!firstName) return { ok: false, message: "First name is required." };

  const email = normalizeEmail(str(formData, "email"));
  if (!looksLikeEmail(email)) return { ok: false, message: "Enter a valid email address." };

  const password = str(formData, "password");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== str(formData, "confirmPassword")) {
    return { ok: false, message: "The two passwords do not match." };
  }

  const isStaff = str(formData, "isStaff") === "true";

  // Staff accounts can see every tutor's records, so claiming the staff flag
  // can be gated behind a shared code. With STAFF_ACCESS_CODE unset the gate
  // is open - see the README note about this role.
  if (isStaff) {
    const expected = process.env.STAFF_ACCESS_CODE;
    if (expected && str(formData, "accessCode") !== expected) {
      return { ok: false, message: "That staff access code is not correct." };
    }
  }

  const taken = await prisma.tutor.findUnique({ where: { email }, select: { id: true } });
  if (taken) {
    return { ok: false, message: "An account already exists for that email. Log in instead." };
  }

  // Two accounts under the same name make reports ambiguous, so names have to
  // be distinct too (add a middle initial or suffix to tell them apart).
  const lastName = optStr(formData, "lastName");
  const sameName = await prisma.tutor.findFirst({
    where: {
      firstName: { equals: firstName, mode: "insensitive" },
      lastName: lastName
        ? { equals: lastName, mode: "insensitive" }
        : null,
    },
    select: { id: true },
  });
  if (sameName) {
    return {
      ok: false,
      message: `An account for "${[firstName, lastName].filter(Boolean).join(" ")}" already exists. Log in, or add a middle initial to tell the two apart.`,
    };
  }

  let account;
  try {
    account = await prisma.tutor.create({
    data: {
      isStaff,
      email,
      passwordHash: hashPassword(password),
      firstName,
      lastName,
      site: optStr(formData, "site"),
      days: optStr(formData, "days"),
      times: optStr(formData, "times"),
    },
    });
  } catch (error) {
    // Two people submitting the same email at once: the database unique index
    // is the real guarantee, the check above is just for a better message.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { ok: false, message: "An account already exists for that email. Log in instead." };
    }
    throw error;
  }

  setTutorCookie(account.id);
  revalidatePath("/");
  redirect("/");
}

/** Signs in to an existing account. */
export async function logIn(formData: FormData): Promise<ActionResult> {
  const email = normalizeEmail(str(formData, "email"));
  const password = str(formData, "password");

  if (!email || !password) {
    return { ok: false, message: "Enter your email and password." };
  }

  const account = await prisma.tutor.findUnique({ where: { email } });

  // One message for every failure, so this cannot be used to discover which
  // email addresses have accounts.
  const rejected: ActionResult = { ok: false, message: "That email and password do not match." };
  if (!account) return rejected;

  if (!account.passwordHash) {
    return {
      ok: false,
      message: "This account has no password yet. Use the account setup link below.",
    };
  }

  if (!verifyPassword(password, account.passwordHash)) return rejected;

  setTutorCookie(account.id);
  revalidatePath("/");
  redirect("/");
}

export async function logOut(): Promise<void> {
  clearTutorCookie();
  redirect("/login");
}

/** Changes the signed-in account's own password. */
export async function changePassword(formData: FormData): Promise<ActionResult> {
  const accountId = getCurrentTutorId();
  if (!accountId) redirect("/login");

  const account = await prisma.tutor.findUnique({ where: { id: accountId as string } });
  if (!account) redirect("/login");

  const current = str(formData, "currentPassword");
  if (account.passwordHash && !verifyPassword(current, account.passwordHash)) {
    return { ok: false, message: "Your current password is not correct." };
  }

  const next = str(formData, "newPassword");
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (next !== str(formData, "confirmPassword")) {
    return { ok: false, message: "The two passwords do not match." };
  }

  await prisma.tutor.update({
    where: { id: accountId as string },
    data: { passwordHash: hashPassword(next) },
  });

  return { ok: true, message: "Password updated." };
}

// ---------- Profile ----------

export async function updateTutor(tutorId: string, formData: FormData): Promise<void> {
  const signedIn = getCurrentTutorId();
  if (signedIn !== tutorId) throw new Error("You can only edit your own profile.");

  const firstName = str(formData, "firstName");
  if (!firstName) throw new Error("Tutor first name is required.");

  await prisma.tutor.update({
    where: { id: tutorId },
    data: {
      firstName,
      lastName: optStr(formData, "lastName"),
      site: optStr(formData, "site"),
      days: optStr(formData, "days"),
      times: optStr(formData, "times"),
    },
  });

  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/");
}

// ---------- Students ----------

export async function createStudent(formData: FormData): Promise<void> {
  const tutorId = await requireEditor();

  const firstName = str(formData, "firstName");
  if (!firstName) throw new Error("Student first name is required.");

  const student = await prisma.student.create({
    data: {
      tutorId,
      firstName,
      lastName: optStr(formData, "lastName"),
      site: optStr(formData, "site"),
      days: optStr(formData, "days"),
      times: optStr(formData, "times"),
      achievements: {
        create: ACHIEVEMENT_CATALOG.flatMap((cat) =>
          cat.items.map((item) => ({
            category: cat.key,
            itemKey: item.key,
            label: item.label,
          }))
        ),
      },
    },
  });

  revalidatePath("/");
  redirect(`/students/${student.id}`);
}

export async function updateStudentProfile(studentId: string, formData: FormData): Promise<void> {
  await requireOwnedStudent(studentId);

  const firstName = str(formData, "firstName");
  if (!firstName) throw new Error("Student first name is required.");

  await prisma.student.update({
    where: { id: studentId },
    data: {
      firstName,
      lastName: optStr(formData, "lastName"),
      site: optStr(formData, "site"),
      days: optStr(formData, "days"),
      times: optStr(formData, "times"),
    },
  });

  revalidatePath("/");
  revalidatePath(`/students/${studentId}`);
}

/**
 * Permanently deletes a student and everything attached to them (attendance
 * entries and achievements cascade). Intended for mistakes and test entries —
 * a student who simply finished tutoring should be marked stopped instead, so
 * their hours stay in the record for reporting.
 */
export async function deleteStudent(studentId: string): Promise<ActionResult> {
  try {
    await requireOwnedStudent(studentId);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not delete." };
  }

  await prisma.student.delete({ where: { id: studentId } });

  revalidatePath("/");
  redirect("/");
}

export async function markStudentStopped(studentId: string, formData: FormData): Promise<void> {
  await requireOwnedStudent(studentId);
  const reason = str(formData, "reason");

  await prisma.student.update({
    where: { id: studentId },
    data: {
      active: false,
      stoppedAt: new Date(),
      stoppedReason: reason || "(no reason given)",
    },
  });

  revalidatePath("/");
  revalidatePath(`/students/${studentId}`);
}

export async function reactivateStudent(studentId: string): Promise<void> {
  await requireOwnedStudent(studentId);
  await prisma.student.update({
    where: { id: studentId },
    data: { active: true, stoppedAt: null, stoppedReason: null },
  });

  revalidatePath("/");
  revalidatePath(`/students/${studentId}`);
}

// ---------- Attendance ----------

const VALID_TYPES: AttendanceType[] = ["HOURS", "TUTOR_ABSENT", "STUDENT_ABSENT", "HOLIDAY"];

export async function saveAttendanceEntry(studentId: string, formData: FormData): Promise<void> {
  await requireOwnedStudent(studentId);
  const dateStr = str(formData, "date");
  const typeRaw = str(formData, "type") as AttendanceType;
  const hoursRaw = str(formData, "hours");
  const notes = optStr(formData, "notes");

  if (!dateStr) throw new Error("A date is required.");
  const type = VALID_TYPES.includes(typeRaw) ? typeRaw : "HOURS";
  const hours = type === "HOURS" ? parseFloat(hoursRaw || "0") : null;

  if (type === "HOURS" && (hours === null || Number.isNaN(hours) || hours <= 0)) {
    throw new Error("Enter a positive number of hours.");
  }

  // Parse as a local date (yyyy-mm-dd from <input type="date">) to avoid
  // timezone shifting the day.
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  await prisma.attendanceEntry.upsert({
    where: { studentId_date: { studentId, date } },
    create: { studentId, date, type, hours, notes },
    update: { type, hours, notes },
  });

  revalidatePath(`/students/${studentId}`);
}

export async function deleteAttendanceEntry(studentId: string, entryId: string): Promise<void> {
  await requireOwnedStudent(studentId);
  await prisma.attendanceEntry.delete({ where: { id: entryId } });
  revalidatePath(`/students/${studentId}`);
}

// ---------- Achievements ----------

export async function setAchievementAttained(
  studentId: string,
  achievementId: string,
  attained: boolean
): Promise<void> {
  await requireOwnedStudent(studentId);
  await prisma.achievement.update({
    where: { id: achievementId },
    data: { attained, attainedAt: attained ? new Date() : null },
  });
  revalidatePath(`/students/${studentId}`);
}

export async function addOtherAchievement(studentId: string, formData: FormData): Promise<void> {
  await requireOwnedStudent(studentId);
  const label = str(formData, "label");
  if (!label) throw new Error("Describe the achievement.");

  await prisma.achievement.create({
    data: {
      studentId,
      category: "OTHER",
      itemKey: `other_${Date.now()}`,
      label,
      attained: true,
      attainedAt: new Date(),
    },
  });

  revalidatePath(`/students/${studentId}`);
}

export async function deleteOtherAchievement(studentId: string, achievementId: string): Promise<void> {
  await requireOwnedStudent(studentId);
  await prisma.achievement.delete({ where: { id: achievementId } });
  revalidatePath(`/students/${studentId}`);
}
