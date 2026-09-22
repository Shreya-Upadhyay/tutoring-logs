"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTutorId, setTutorCookie, clearTutorCookie } from "@/lib/tutorSession";
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

/**
 * The signed-in account, if it is allowed to change data. LVAEP staff accounts
 * are view-only, enforced here rather than only in the UI so a hand-crafted
 * request cannot write either.
 */
async function requireEditor(): Promise<string> {
  const id = getCurrentTutorId();
  if (!id) redirect("/onboarding");

  const account = await prisma.tutor.findUnique({
    where: { id: id as string },
    select: { id: true, role: true },
  });
  if (!account) redirect("/onboarding");
  if (account.role === "STAFF") {
    throw new Error("LVAEP staff accounts can view records but not change them.");
  }
  return account.id;
}

/** Editor check plus ownership: a tutor may only touch their own students. */
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

// ---------- Tutor profile ----------

export async function createTutor(formData: FormData): Promise<ActionResult> {
  const firstName = str(formData, "firstName");
  if (!firstName) return { ok: false, message: "First name is required." };

  const role = str(formData, "role") === "STAFF" ? "STAFF" : "TUTOR";

  // Staff accounts can see every tutor's records, so registering as staff can
  // be gated behind a shared code. With STAFF_ACCESS_CODE unset the gate is
  // open - see the README note about this being an honour-system role.
  if (role === "STAFF") {
    const expected = process.env.STAFF_ACCESS_CODE;
    if (expected && str(formData, "accessCode") !== expected) {
      return { ok: false, message: "That staff access code is not correct." };
    }
  }

  const tutor = await prisma.tutor.create({
    data: {
      role,
      firstName,
      lastName: optStr(formData, "lastName"),
      site: role === "TUTOR" ? optStr(formData, "site") : null,
      days: role === "TUTOR" ? optStr(formData, "days") : null,
      times: role === "TUTOR" ? optStr(formData, "times") : null,
    },
  });

  setTutorCookie(tutor.id);
  revalidatePath("/");
  redirect("/");
}

export async function updateTutor(tutorId: string, formData: FormData): Promise<void> {
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

export async function switchTutor(): Promise<void> {
  clearTutorCookie();
  redirect("/onboarding");
}

export async function pickTutor(tutorId: string): Promise<void> {
  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } });
  if (!tutor) throw new Error("Tutor not found.");
  setTutorCookie(tutor.id);
  revalidatePath("/");
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
