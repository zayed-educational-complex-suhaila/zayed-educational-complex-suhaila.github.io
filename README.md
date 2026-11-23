# Exam Training Platform — Zayed Educational Complex – Suhaila (Grades 5–12, 2026–2027)

Bilingual (عربي / English) practice-exam website in the SwiftAssess exam style.

## Live site: GitHub Pages + Supabase
**https://zayed-educational-complex-suhaila.github.io**

- **GitHub Pages** serves the static website (`public/`), deployed by `.github/workflows/pages.yml` on every push to `main`.
- **Supabase** (PostgreSQL) holds students, exams, attempts, the active term and the PINs. The browser can only call the
  `api_*` functions in [`database/supabase.sql`](database/supabase.sql); every table is locked with Row Level Security.
  Each function checks the caller's session, students never receive the answer key before submitting, and attempts are scored on the server.
- The site switches to Supabase automatically when it's served from the web and `SUPABASE_URL` / `SUPABASE_ANON_KEY` are set in
  [`public/js/config.js`](public/js/config.js). Opened from disk or `localhost`, it stays in offline **demo mode**.

### One-time setup
1. **Supabase**: create a project → **SQL Editor** → run `database/supabase.sql`, then `database/supabase_seed_teachers.sql`,
   then the student list `data/supabase_seed_students.sql` (kept out of Git; or upload the roster later in Admin → Student Roster).
2. **Project Settings → API**: copy the *Project URL* and the *anon public* key into `public/js/config.js`.
3. **GitHub**: push this repo, then **Settings → Pages → Source: GitHub Actions**.
4. Open the site, sign in as Admin with the default PIN, and **change both PINs immediately** (Admin → Security).
   The defaults are written in this public repository.

### Guest practice (visitors from outside the school)
On the sign-in page visitors choose **Guest** and type their class code: `5g` … `8g`, then `9g`/`9a` … `12g`/`12a`
(g = General, a = Advanced; Arabic digits and ع/م also work). They see every published exam of that grade and track
in the active term and get the result + review at the end. **Nothing is saved**: no attempts, not counted in results
or reports, no teacher names shown. Admin → Security → "Guest codes on" switches it off (current guests are signed out).

Student data is never committed: `.gitignore` excludes the roster, every student list, the seed with Student IDs,
`public/data/` and exported reports.

## Offline demo (USB stick, no internet)
1. Copy the whole folder to the USB. On any Windows PC double-click **`START WEBSITE.bat`** (or **`START WEBSITE.html`**).
2. Sign in: Admin PIN `2026`, Teacher PIN `5113`, or a Student ID from `data/students.json`.
   Upload exams from the **`samples`** folder to have something to show.

In the demo, exams and attempts are saved **in that computer's browser** only. Use Edge or Chrome.

## For developers
[docs/HANDOFF.md](docs/HANDOFF.md), [docs/API_CONTRACT.md](docs/API_CONTRACT.md) (custom REST backend option) and
[docs/DATA_CONTRACTS.md](docs/DATA_CONTRACTS.md). `public/exam.html` is generated from `scripts/exam-engine.template.html`
(`npm run build:exam`, needs `reference/`, which is not in the repo).
