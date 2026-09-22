# LVAEP Tutoring Logs

A web app for Literacy Volunteers of America, Essex/Passaic County for recording tutoring
sessions and student progress: tutors log sessions on a calendar, check off achievement
goals, and download a monthly attendance sheet as a PDF with one click.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** ORM on **PostgreSQL** (works with Vercel Postgres, Neon, or Supabase)
- **jsPDF** for client-side attendance-sheet PDF export
- Password sign-in — scrypt hashes from Node's standard library (`src/lib/password.ts`) and an
  HMAC-signed session cookie (`src/lib/tutorSession.ts`), so no auth dependency to keep current.

## What it does

- **Monthly and annual reports** — `/reports` is the reporting surface the program runs on.
  Pick **Monthly** and a month, or **Yearly** and a fiscal year (July–June), and the report
  shows students served, sessions, total hours, goals met, per-tutor subtotals and a
  per-student breakdown (a Jul–Jun hours grid in the yearly view). Tutors see their own
  students; staff see the whole program. **Tutors** and **Students** are multi-select
  filters — everything by default, or any combination of tutors and students.
- **The report PDF is the full package** — the summary tables, then the attendance
  spreadsheet for the period (students down the side, days of the month across; a full
  Jul–Jun daily grid per student for annual reports), then each student's goals checklist.
- **Sign up / log in** — separate pages, with an email and password (minimum 8 characters).
  Passwords can be changed from the profile page.
- **Tutor and/or LVAEP staff** — the two are not exclusive, so one person can tutor their own
  students *and* hold the staff view. Anyone can record sessions for students they tutor; the
  staff flag adds a read-only layer over every other tutor and their students. Write access
  follows ownership, not the flag, so a staff member still edits the students they tutor.
- **Tutor profiles** — a tutor enters their name (plus optional site, days and times) once;
  the profile stays editable and you can switch between accounts on a shared device.
- **Students** — create students with a first and last name, search by either, and see hours
  logged this fiscal year at a glance. Each student has their own page.
- **Attendance** — click a day on the calendar and pick **Tutored** (then enter the hours),
  or mark Tutor Absent, Student Absent, or Holiday. Each kind has its own colour (green / amber / rose / violet),
  used consistently across the calendar, the grid and the PDFs. A Jul-Jun attendance grid
  builds itself from those entries, with monthly and grand totals.
- **Achievements** — a checklist of goals grouped by category (Economic, Educational, Family,
  Societal/Community), plus a free-text list for anything else. Starred goals are the
  federally-reportable core outcome measures.
- **PDFs** — four downloads per student: a **month report** for any month straight from the
  student's page, plus the attendance sheet for a fiscal year, the
  achievement checklist, and a full record (details + summary figures + attendance +
  achievements) from the button at the top of the student's page.
- **Ending tutoring** — mark a student as no longer being tutored with a reason. Their hours
  stay in the record for reporting; they can be resumed later.
- **Deleting** — permanently removes a student and their records. Intended for duplicates,
  typos and practice entries, so it asks you to type the student's name to confirm when
  there are sessions to lose. Tutor profiles cannot be deleted.

## Local development

1. Get a Postgres connection string. Easiest free option: [neon.tech](https://neon.tech) — create
   a project and copy the connection string (use the **pooled** one if offered).
2. Copy `.env.example` to `.env` and paste your connection string into `DATABASE_URL`.
3. Install dependencies and create the tables:
   ```bash
   npm install
   npm run db:push
   ```
4. Run the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 — it will walk you through creating a tutor profile.

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this from the deployed repo).
2. In Vercel: **Add New... > Project**, import the GitHub repo.
3. Before the first deploy, go to the project's **Storage** tab, choose **Postgres**, and
   create a database. Vercel automatically adds the `DATABASE_URL` (and related) environment
   variables to the project — no separate account needed.
4. Deploy. The build automatically runs `prisma generate`, creates/updates the database
   tables (`prisma db push`), and then builds the app — so there is no manual migration
   step. If no database is attached yet the build still succeeds — it logs a warning and
   the site shows a page telling you to attach one and redeploy.
5. Open the deployed URL — the app is live and storing data in Postgres.

The app accepts whichever connection-string variable your database integration set
(`DATABASE_URL`, `POSTGRES_PRISMA_URL`, or `POSTGRES_URL`), so nothing needs renaming in the
Vercel dashboard. See `src/lib/dbUrl.ts`.

### If you see "Application error" on the deployed site

That means the app is running but couldn't reach the database. Check, in order:

1. A Postgres database exists for the project (**Storage** tab).
2. The connection-string variable is present for the **Production** environment.
3. The project has been **redeployed** since the database was added — the tables are created
   during the build, so a deploy that ran before the database existed has no tables.

The deployment's **Logs** tab in Vercel shows the underlying error message.

## Project structure

```
src/
  app/                 Pages (App Router) — dashboard, onboarding, profile, student detail
  components/          UI components (calendar, attendance grid, achievements checklist, ...)
  lib/
    actions.ts         All data mutations (Next.js Server Actions) — the only place writes
                       happen, and where the role/ownership guards live
    reports.ts         Monthly/annual aggregation and the month attendance matrix
    password.ts        scrypt password hashing and email helpers
    reportPdf.ts       Report PDF rendering
    account.ts         Current account + role helpers (requireAccount / requireTutorAccount)
    achievementCatalog.ts   The achievement goal categories and items
    attendanceTypes.ts  Labels, codes and colours for each kind of attendance entry
    personName.ts       first/last name formatting helpers
    attendanceGrid.ts  Turns raw attendance rows into the Jul-Jun x 1-31 grid
    pdf.ts             Client-side PDF generation (attendance, achievements, full record)
    fiscalYear.ts       Jul-Jun fiscal year helpers
    tutorSession.ts     Cookie-based "who is the current tutor" helper
prisma/schema.prisma   Data model: Tutor, Student, AttendanceEntry, Achievement
scripts/db-setup.mjs   Applies the schema during the build
scripts/pre-migrations.mjs  Data migrations that must run before the schema is applied
```

## Accounts, roles and environment variables

- `STAFF_ACCESS_CODE` — when set, signing up as LVAEP staff requires this code. Leave it
  unset and anyone can sign up as staff.
- `AUTH_SECRET` — key used to sign session cookies. Set it to any long random string. If it
  is missing the app falls back to `DATABASE_URL` (also secret and stable), so sessions are
  still signed; setting it explicitly is better because rotating the database URL then
  doesn't log everyone out.

Write access is **enforced on the server by ownership**: a tutor can only change students
they own, so the staff view is read-only over everyone else's students without needing a
separate rule — and a staff member who also tutors keeps full control of their own students.

**Accounts created before passwords existed** have no email or password. The login page
lists them under "Finish setting up an older account" so the owner can add an email and
password without losing the students already recorded. Anyone could claim one of those while
it sits unclaimed, so set them up promptly — once claimed, an account needs its password.

## Known simplifications (flagging for LVAEP staff)

- **No password reset by email.** Passwords can be changed from the profile page while
  logged in, but a forgotten password needs a hand fix in the database.
- **Achievement "attained date"** is set to the day the checkbox is checked, rather than
  being entered by hand.
- **One fiscal year's attendance grid at a time** is shown/downloaded; switch the "Fiscal
  year" dropdown on a student's page to see a different year.
