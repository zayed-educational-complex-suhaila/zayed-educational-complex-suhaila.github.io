# REST API contract (server mode)

The website calls **only** these endpoints (see `public/js/api.js → serverApi()`).
Set `mode: 'server'` in `public/js/config.js` once they exist. Everything is JSON, same origin,
authenticated by an **HTTP-only, signed session cookie**.

Errors must use: `HTTP 4xx/5xx` + body `{ "error": "<code>", "message": "<human text>" }`.
Codes the UI understands: `unauthorized` (session missing/expired → UI returns to sign-in),
`bad_pin`, `locked` (message = seconds remaining), `unknown_student`, `name_required`,
`forbidden`, `not_found`, `invalid_exam`, `subject_not_taught` (subject not in the grade/track list of `catalog.js`), `unknown_teacher` (teacher name not in `teacher_assignments`), `bad_term`, `bad_pin_format`, `empty_roster`.

Roles: **A** = admin, **T** = teacher, **S** = student. "A,T" = admin or teacher.

## Auth & term

| Method | Path | Role | Body / query | Returns |
|---|---|---|---|---|
| GET | `/api/term` | public | – | `{ active_term }` |
| PUT | `/api/admin/term` | A | `{ active_term: "Term 1"\|"Term 2"\|"Term 3" }` | `{ active_term }` |
| POST | `/api/auth/admin` | public | `{ pin }` | session object |
| POST | `/api/auth/teacher` | public | `{ pin, teacher_name, grade, track, subject }` | session object |
| POST | `/api/auth/student` | public | `{ student_id }` (already normalized by UI — normalize again on server) | session object |
| GET | `/api/auth/session` | any | – | session object, or 401 |
| POST | `/api/auth/logout` | any | – | `{ ok: true }` (clear cookie) |
| PUT | `/api/admin/pins` | A | `{ kind: "admin"\|"teacher", new_pin: "1234" }` | `{ ok: true }` |

Session object:
```json
{ "role": "admin", "name": "Administrator" }
{ "role": "teacher", "name": "Ms. Sara Ahmed", "grade": 8, "track": "General", "subject": "English" }
{ "role": "student", "student_id": "123456SHJ", "grade_num": 6, "grade_label_en": "Grade 6",
  "grade_label_ar": "الصف السادس", "track": "General", "section": "سادس 1" }
```

**Security requirements**
- PINs are stored only as salted hashes (bcrypt/argon2/scrypt) in `settings`. Defaults on first start: Admin `2026`, Teacher `5113`. Never send PINs or hashes to the browser.
- Brute-force limit: e.g. 5 wrong tries per IP + role → 60 s lock (`429`, `error: "locked"`, `message: "<seconds>"`).
- Student ID normalization (server side too): Arabic-Indic `٠-٩` and Persian `۰-۹` → `0-9`, remove all whitespace, uppercase, strip trailing `.0`.
- Cookie: `HttpOnly; Secure; SameSite=Lax`, ~12 h lifetime.

## Roster

| Method | Path | Role | Query / body | Returns |
|---|---|---|---|---|
| GET | `/api/sections` | public* | – | `[{ section, grade_num, track, student_count }]` sorted by grade, track, section |
| GET | `/api/students` | A,T | `grade, track, section, q` (q = ID substring) | `[student]` |
| POST | `/api/admin/roster` | A | multipart `file` (.xlsx) | `{ students, sections, added, removed, notes:[] }` |

\* the sign-in page shows section/student totals; return counts only (no IDs) if you prefer to keep it public.
Roster parsing: reuse `public/js/shared/roster-parser.js` (`parseRosterWorkbook(buffer)`) — it is Node-compatible.
Replacing the roster must **not** delete existing attempts.

## Exams

| Method | Path | Role | Query / body | Returns |
|---|---|---|---|---|
| GET | `/api/exams` | A,T | `term` (`Term 1..3` or `ALL`), `grade`, `track` (`General`/`Advanced`/`All`/`ALL`), `subject`, `teacher` (substring), `published` (`true`/`false`) | `[examSummary]` newest first |
| GET | `/api/exams/:id` | A,T,S | – | full exam (see DATA_CONTRACTS.md). Students: 403 unless published, visible to their class **and** `term == active_term` |
| POST | `/api/exams` | A,T | full exam payload (below) | `{ id }` |
| PATCH | `/api/exams/:id` | A,T | any of `title, subject, grade_num, track, term, target_sections, teacher_name, is_published` | `{ ok: true }` |
| DELETE | `/api/exams/:id` | A,T | – | `{ ok: true }` (cascade-delete attempts) |
| GET | `/api/exams/:id/item-stats` | A,T | `track`, `section` | `[{ index, q_num, section_part, topic, text, correct_option, attempts, answered, correct, correct_rate, picks:[n,n,n,n] }]` (original question order, all attempts in scope) |

`examSummary`:
```json
{ "id": "uuid", "title": "…", "subject": "English", "grade_num": 8, "track": "General", "term": "Term 1",
  "target_sections": ["ALL"], "teacher_name": "…", "is_published": 1, "q_count": 9, "total_marks": 21,
  "created_at": "ISO", "updated_at": "ISO", "duration_minutes": 30, "calculator_allowed": false, "passing_percent": 50,
  "unique_students": 3, "class_total": 68, "attempts_count": 4, "avg_best_pct": 63.49 }
```
`class_total` = students whose grade/track/section can see the exam. `avg_best_pct` = mean of each student's best %, or `null`.

`POST /api/exams` payload = `{ title, subject, grade_num, track, term, target_sections, teacher_name, config, passages, questions, is_published }`.
Questions may carry `image_url` — and answer pictures in `option_images[]` (parallel to `options`, `''` = no picture) — as
**`data:image/...;base64` URIs** (pictures extracted from Excel or pasted by the teacher).
The server must decode each data URI (in `image_url` **and** every `option_images[k]`), save it to `/uploads/exam-images/<uuid>.<ext>`
and replace it with the public path before inserting. Validate size (e.g. ≤ 3 MB per image) and MIME type (png, jpeg, gif, webp, svg → sanitize or reject svg).
Re-validate the payload on the server (same rules as the parser: ≥2 options, each with text or a picture, `correct` within options, marks > 0).

## Student

| Method | Path | Role | Query | Returns |
|---|---|---|---|---|
| GET | `/api/student/exams` | S | – | `{ active_term, exams:[{ id, title, subject, teacher_name, term, q_count, total_marks, duration_minutes, calculator_allowed, my_attempts, my_best_score, my_best_pct, my_best_passed, created_at }] }` — only published, `term == active_term`, `grade_num == student.grade_num`, `track ∈ {All, student.track}`, `target_sections ∋ ALL or student.section` |
| GET | `/api/student/attempts` | S | `term` (`ALL` allowed) | `[attempt + exam_title, subject, term, teacher_name]` newest first |

## Attempts & results

| Method | Path | Role | Body / query | Returns |
|---|---|---|---|---|
| POST | `/api/attempts` | S | `{ exam_id, answers, time_spent_seconds, score_gained, total_marks }` | saved attempt (without `answers_json`) |
| GET | `/api/attempts` | A,T | `term, grade, track, section, subject, exam_id, student_id` | `[attempt + exam_title, subject, term, teacher_name]` (no answers) |
| GET | `/api/attempts/:id` | A,T,S(own) | – | attempt + `answers` (parsed object) |

**Scoring is done on the server** from the stored answer key — ignore the client's `score_gained`.
`answers` is keyed by the ORIGINAL question index: `{ "0": { "picked": 2, "marked": false, "order": 5 }, … }`
(`picked` = original option index or `null`). `attempt_number` = previous count for (student, exam) + 1 (do it in a transaction).
`passed` = `percentage >= config.passingPercent` (default 50). Snapshot `grade_num, track, section` from the student row.

## Admin reports

| Method | Path | Role | Query | Returns |
|---|---|---|---|---|
| GET | `/api/admin/report-data` | A | `term` | `{ term, students, exams:[summary fields + total_marks], attempts:[no answers] }` (feeds the live summary) |
| GET | `/api/admin/export/student-performance` | A | `term, grade, track, section, subject` | `Student_Attempts_Highest_Marks_<Term>.xlsx` |
| GET | `/api/admin/export/teacher-uploads` | A | `term` | `Teacher_Uploads_Status_<Term>.xlsx` |
| GET | `/api/admin/export/full` | A | same as above | `Full_Admin_Report_<Term>.xlsx` (all 4 sheets) |

Generate the workbooks with the ready-made, Node-compatible builders in `public/js/shared/reports.js`:
```js
const Reports = require('./public/js/shared/reports.js');
const b = Reports.buildStudentPerformanceWorkbook({ term, students, exams, attempts, filters: { grade, track, section, subject } });
res.setHeader('Content-Disposition', `attachment; filename="${b.filename}"`);
await b.wb.xlsx.write(res);
```
