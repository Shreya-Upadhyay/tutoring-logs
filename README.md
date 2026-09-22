# LVAEP Tutoring Logs

A web app for Literacy Volunteers of America, Essex/Passaic County that replaces the paper
"Student Monthly Attendance & Achievement Form" with an online workflow: tutors record
sessions on a calendar, check off achievement goals, and generate the same monthly
attendance sheet as a PDF with one click.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** ORM on **PostgreSQL** (works with Vercel Postgres, Neon, or Supabase)
- **jsPDF** for client-side attendance-sheet PDF export
- No password auth — tutors pick/create a profile once, remembered in a cookie. This is a
  deliberate simplification for a small internal team tool; see `src/lib/tutorSession.ts`.

## How it maps to the paper form

| Paper form | App |
|---|---|
| Tutor / Student header | Tutor profile (onboarding) + Student profile |
| Contact Information box | Sidebar box on the dashboard |
| Footer instructions | "Directions for Tutors" sidebar box |
| Attendance grid (day x month, hours or TA/SA/H) | Calendar entry + auto-generated grid + "Download PDF" |
| Achievements checklist (A-E categories) | Achievements checklist per student, plus a free-text "Other" list |
| "STOPPED" box + reason | "Student is no longer being tutored" button at the bottom of a student's page |

Deleting vs. stopping: marking a student **stopped** keeps their hours in the record (what the
paper form's STOPPED box does). **Deleting** a student is for mistakes and test entries — it
permanently removes their attendance and achievements, and asks you to type the student's name
to confirm when there are sessions to lose. Tutor profiles cannot be deleted from the app at
all — use "Switch tutor profile" to move between them.

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
    actions.ts         All data mutations (Next.js Server Actions) — the only place writes happen
    achievementCatalog.ts   The A-E achievement categories/items, copied from the paper form
    attendanceGrid.ts  Turns raw attendance rows into the Jul-Jun x 1-31 grid
    pdf.ts             Client-side PDF generation for the attendance grid
    fiscalYear.ts       Jul-Jun fiscal year helpers
    tutorSession.ts     Cookie-based "who is the current tutor" helper
prisma/schema.prisma   Data model: Tutor, Student, AttendanceEntry, Achievement
```

## Known simplifications (flagging for LVAEP staff)

- **No per-tutor login/password.** Any tutor with the link can see all students. If you need
  tutors to only see their own students, that requires adding real authentication.
- **Achievement "attained date"** is set to the day the checkbox is checked, not a
  user-entered date (the paper form doesn't specify one either).
- **One fiscal year's attendance grid at a time** is shown/downloaded; switch the "Fiscal
  year" dropdown on a student's page to see a different year.
