# LVAEP Tutoring Logs

A web app for Literacy Volunteers of America, Essex/Passaic County for recording tutoring
sessions and student progress: tutors log sessions on a calendar, check off achievement
goals, and download a monthly attendance sheet as a PDF with one click.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** ORM on **PostgreSQL** (works with Vercel Postgres, Neon, or Supabase)
- **jsPDF** for client-side attendance-sheet PDF export
- No password auth — people register once and their account is remembered in a cookie. This
  is a deliberate simplification for a small internal team tool; see `src/lib/tutorSession.ts`.

## What it does

- **Monthly and annual reports** — `/reports` is the reporting surface the program runs on.
  Pick **Monthly** and a month, or **Yearly** and a fiscal year (July–June), and the report
  shows students served, sessions, total hours, goals met, per-tutor subtotals and a
  per-student breakdown (a Jul–Jun hours grid in the yearly view), downloadable as a PDF.
  Tutors see their own students; staff see the whole program or one tutor at a time.
- **Two kinds of account** — register as a **tutor** (records sessions for your own students)
  or as **LVAEP staff** (sees every tutor, their students, and all reports, but cannot change
  anything). Staff land one layer up: a list of tutors, each opening onto that tutor's
  students.
- **Tutor profiles** — a tutor enters their name (plus optional site, days and times) once;
  the profile stays editable and you can switch between accounts on a shared device.
- **Students** — create students with a first and last name, search by either, and see hours
  logged this fiscal year at a glance. Each student has their own page.
- **Attendance** — click a day on the calendar to log hours tutored, or mark Tutor Absent,
  Student Absent, or Holiday. Each kind has its own colour (green / amber / rose / violet),
  used consistently across the calendar, the grid and the PDFs. A Jul-Jun attendance grid
  builds itself from those entries, with monthly and grand totals.
- **Achievements** — a checklist of goals grouped by category (Economic, Educational, Family,
  Societal/Community), plus a free-text list for anything else. Starred goals are the
  federally-reportable core outcome measures.
- **PDFs** — three downloads per student: the attendance sheet for a fiscal year, the
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
    reports.ts         Monthly/annual aggregation (pure functions)
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

## Roles and the staff access code

Registering as LVAEP staff can be gated behind a shared code: set a `STAFF_ACCESS_CODE`
environment variable in Vercel and the staff option requires it. Leave it unset and anyone
can register as staff.

Be aware of what this is and is not. Staff being **view-only is enforced on the server** —
every write checks the role, and tutors can only touch their own students, so no
hand-crafted request gets around it. But because there are no passwords, the *identity* side
is honour-system: anyone with the link can pick up an existing account on the "already
registered" list. That is fine for a small internal team; it is not suitable if student
records need to be private from other tutors. Adding real accounts with passwords would fix
that and is the natural next step if LVAEP needs it.

## Known simplifications (flagging for LVAEP staff)

- **No passwords.** See the section above — accounts are chosen, not authenticated.
- **Achievement "attained date"** is set to the day the checkbox is checked, rather than
  being entered by hand.
- **One fiscal year's attendance grid at a time** is shown/downloaded; switch the "Fiscal
  year" dropdown on a student's page to see a different year.
