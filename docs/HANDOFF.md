# Developer handoff — Exam Training Platform (Zayed Educational Complex – Suhaila)

**Scope of this package:** the complete website (all 5 pages, design, bilingual UI, exam engine, Excel
templates, parser, reports) + cleaned data + database schema. **Not included (your job):** the backend
server, hosting, HTTPS, persistence and backups.

The site already runs end-to-end in **demo mode** (all logic inside the browser, IndexedDB storage) so the
school can review every flow before the server exists. You switch it to your API with one line.

---

## 1. Folder map

| Path | What it is |
|---|---|
| `public/` | **The website** (static files — serve this folder as the web root) |
| `public/index.html` | Sign-in gate (Student ID / Teacher PIN / Admin PIN) |
| `public/admin.html` | Admin: active-term switcher, export reports, classes & uploads, results, roster, PINs |
| `public/teacher.html` | Teacher: upload (subject templates + AI prompts + live preview + image controls), manage, results |
| `public/student.html` | Student: available exams for their grade/track/section/active term, history |
| `public/exam.html` | SwiftAssess exam engine (**generated** — edit `scripts/exam-engine.template.html`, then `npm run build:exam`) |
| `public/js/config.js` | **The only switch:** `mode: 'demo'` → `'server'` |
| `public/js/api.js` | All data access. `serverApi()` = fetch wrapper for your endpoints; `demoApi()` = reference implementation of the business rules |
| `public/js/shared/*.js` | Isomorphic (browser **and** Node) modules — reuse them in the backend: `exam-parser.js`, `excel-templates.js`, `roster-parser.js`, `reports.js`, `ai-prompts.js` |
| `public/css/portal.css` | Design system (colour grading from the school presentation) |
| `public/assets/` | School header, complex logo, motto banner, presentation icons (`ornaments/`) |
| `database/schema.sql` | SQLite schema (students, exams, attempts, settings + 2 reporting views) |
| `data/` | `students.json/.csv`, `sections.json`, `seed_students.sql` (526 students), source `roster.xlsx` |
| `templates/` | The 3 subject Excel templates (Term 1 copies) |
| `samples/` | Ready-to-upload test exams (English with passages & 3 options, Math with anchored picture + KaTeX, Science with Excel-365 in-cell picture, Islamic RTL with Tashkeel) + a deliberately broken file for the validation report |
| `docs/API_CONTRACT.md` | Every endpoint the website calls, with request/response shapes |
| `docs/DATA_CONTRACTS.md` | Exam / question / config / answers JSON, template columns |
| `docs/AI_PROMPTS.md` | The 3 subject prompts (EN + AR) |
| `reference/` | Original SwiftAssess HTML and school presentation |

## 2. Run it locally (no backend)
```powershell
npm install
npm run preview      # http://localhost:5173  (static preview only)
```
Demo PINs: **Admin `2026`**, **Teacher `5113`**. Students: any ID from `data/students.json` (e.g. `2012345678`, `123456shj`).
Upload the files in `samples/` from the Teacher Portal to get content.

## 3. Going live — checklist for the hosting developer
1. Build an API that satisfies **`docs/API_CONTRACT.md`** (Node/Express + SQLite fits the original spec; any stack works).
   `demoApi()` in `public/js/api.js` is a working reference for every rule (visibility, best-score, attempt numbering, cascade delete…).
2. Create the DB with `database/schema.sql`, seed with `data/seed_students.sql` (526 rows), insert `active_term='Term 1'`,
   and hash the default PINs (`2026`, `5113`) into `settings.admin_pin_hash` / `teacher_pin_hash`.
3. Serve `public/` as static files and the API under `/api` on the **same origin** (cookie session).
4. Set `mode: 'server'` in `public/js/config.js`.
5. **Delete `public/data/students.json`, `public/data/students-data.js` and `public/data/sections.json` in production** (and remove the `data/students-data.js` script tag from the pages) — they exist only for demo mode
   and would expose every Student ID publicly.
6. Save uploaded pictures (data URIs in `POST /api/exams`) to `/uploads/exam-images/` and serve that folder.
7. Generate the admin `.xlsx` reports with `public/js/shared/reports.js` (Node-compatible).
8. HTTPS, daily DB backup, rate-limit the `/api/auth/*` routes.

### Security notes
- Demo mode checks PINs **in the browser** (salted SHA-256 in IndexedDB) — fine for review, **not** for production.
  In server mode the browser never sees PINs or hashes; all checks happen on the server.
- Score attempts on the server from the answer key (the client score is informational only).
- Students must get 403 for exams outside their grade/track/section or the active term, even by direct URL.
- Teacher content may contain HTML/KaTeX — sanitize on save (allow-list of formatting tags).

## 3b. Subjects, exam blueprints & teachers (school catalog)
- `public/js/shared/catalog.js` holds the **subjects per grade/track** (from the MOE Term 1 timetable), the **official
  electronic-part blueprint** of every exam (question count, marks, options, duration, calculator, exam day — read from the
  school's structures folder) and helper lookups for **teachers** (`public/js/shared/teachers-data.js`, generated from the
  teacher list workbook by `npm run build:teachers`). Full table: [EXAM_BLUEPRINTS.md](EXAM_BLUEPRINTS.md); JSON: `data/exam-blueprints.json`.
- **Science is not taught in most of cycle 3**: only Grades 5–8, 9 General and 10 General. 9 Adv: Physics + Biology ·
  10 Adv: Physics + Chemistry · 11 Gen: Chemistry + Biology · 11 Adv / 12 Gen / 12 Adv: Physics + Chemistry + Biology.
  The UI only offers taught subjects and the API must reject others (`subject_not_taught`).
- Teacher sign-in and upload: **Subject first, then teacher** (only that department's teachers, names from the school list only —
  the API rejects unknown names with `unknown_teacher`), then grade and track — **every teacher can target every grade/track** (the teacher's own classes are pre-selected and marked ★). **Physics, Chemistry and
  Biology count as Science**: the 6 departments are Mathematics, English, Arabic, Islamic Education, Social Studies, Science; for Science a
  "Science branch" field picks Science / Physics / Chemistry / Biology (exams keep the branch so the right blueprint applies). Filters for
  "Science" include all branches. Target sections default to the teacher's own sections. Seed: `data/seed_teachers.sql` → `teacher_assignments`.
- Uploads are compared with the blueprint (e.g. English 26 Qs / 60 marks, Math 20, Islamic 27, Social 25, Arabic 20, Science 20,
  Physics 16, Chemistry/Biology 30) — a mismatch is a **warning**, not an error, so shorter practice sets can still be published.
  Templates and AI prompts are pre-filled with the blueprint (count, parts, duration, calculator).
- Open points for the school: no Grade 11 Advanced Biology structure was supplied (30-question format assumed); Grade 7 Arabic
  has two structures (school file: 20 electronic Qs — used; platform file: 17); the teacher list calls Grade 11 Advanced "11A2"
  while the roster has one section (`الحادي عشر متقدم 1`) — mapped automatically; Physics 12G1 and Chemistry 12G2 have no teacher listed.

## 4. Business rules (already implemented in the UI and in `demoApi`)
- **Visibility:** published AND `grade_num == student.grade_num` AND `track ∈ {All, student.track}` AND
  (`target_sections` contains `ALL` or the student's section) AND `term == active_term`.
- **Unlimited retakes;** `attempt_number` increments per (student, exam). **Best score** = highest %, tie → shortest time → earliest.
- **Terms:** admin switches `active_term`; students see only that term; admins/teachers filter any term (`ALL` supported).
- **Western digits everywhere** (also in Arabic UI); Student-ID input accepts Arabic-Indic digits and lowercase letters.
- **Teacher's Step-1 choice** (grade/track/subject/term/sections) decides where an exam is published; if `Exam_Info` differs,
  the UI shows a notice with a one-click "use the Excel values" override.
- Report 1 includes students with **0 attempts** (`Status = Not Attempted`); Report 2 covers Grades 5–12 General + Grades 9–12 Advanced
  × 6 core subjects (+ any extra subject that has uploads).

## 5. Rebuilding generated files
```powershell
npm run build:roster       # roster.xlsx -> data/*.json, seed SQL, public/data/*.json
npm run build:templates    # templates/*.xlsx + samples/*.xlsx (+ parses them as a self-test)
npm run build:exam         # public/exam.html from the template + SwiftAssess reference
```

## 6. What was verified (demo mode, in the browser)
- Roster: 30 sections / 526 students / 6 SHJ IDs / 7 Advanced sections, 0 errors.
- Admin PIN `2026` accepted, wrong PIN rejected; Teacher PIN `5113` accepted, wrong PIN rejected; PIN change + restore; teachers cannot change PINs.
- Teacher: template + AI prompt switch with the subject (English / STEM / Arabic); all 4 sample files parsed, previewed and published —
  shared passages, 3-option questions, Section_Part badges, KaTeX, anchored picture, Excel-365 in-cell picture, Arabic RTL with Tashkeel.
  Broken file → 5 row-numbered errors and publishing blocked.
- Students: `123456shj` (lowercase) and `٢٠١٧٠٠١٢٧٣` (Arabic digits) sign in; each sees only their grade/track exams; unknown ID rejected.
- Exam engine: timer, part badges, grouped question list, split passage with highlighted cloze gap, calculator, RTL layout,
  submit → saved attempt; Try Again → attempts #2, #3; best score (not latest) reported.
- Results: best-per-student default, expandable attempts, All Attempts toggle, View Answers modal, hardest-questions analytics, KPIs.
- Reports: Student_Exam_Details (240 rows incl. 233 Not Attempted), Student_Summary (526), Upload_Matrix (12), Upload_Details_List (72).
- Term switch Term 1 → Term 2: student sees only Term 2 exams, Term 1 exam blocked by direct URL, admin still lists Term 1.
- EN / عربي switch flips RTL/LTR on every page; no horizontal scroll at 375 px.

Not verified here: anything that needs the real server (cookies, uploads folder, concurrent users) and printing/PDF export on all browsers.
