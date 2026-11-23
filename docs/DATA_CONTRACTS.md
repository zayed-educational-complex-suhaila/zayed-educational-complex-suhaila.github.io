# Data contracts

## Student (roster) — `data/students.json`, `data/seed_students.sql`
```json
{ "student_id": "123456SHJ", "grade_num": 6, "grade_label_en": "Grade 6", "grade_label_ar": "الصف السادس",
  "track": "General", "section": "سادس 1" }
```
- 526 students, 30 sections, Grades 5–12 only (Grades 1–4 and `غير مطابق` skipped).
- 6 alphanumeric IDs ending in `SHJ` (e.g. `123456SHJ`).
- Track = `Advanced` only when the sheet name contains `متقدم` (7 sections), otherwise `General`.
- No names are stored anywhere.

## Exam (full object stored / returned by `GET /api/exams/:id`)
```json
{
  "id": "uuid", "title": "Grade 8 English – EoT1 Practice", "subject": "English",
  "grade_num": 8, "track": "General", "term": "Term 1", "target_sections": ["ALL"],
  "teacher_name": "Ms. Sara Ahmed", "is_published": 1, "created_at": "ISO", "updated_at": "ISO",
  "config": { … EXAM_CONFIG … },
  "passages": { "P1": { "title": "Grammar Cloze", "en": "… (1) _____ …", "ar": "" } },
  "questions": [ { … question … } ]
}
```
DB columns: `config_json`, `passages_json`, `questions_json`, `target_sections_json` hold the JSON above.

### `config` (SwiftAssess `EXAM_CONFIG`, built by the parser from the `Exam_Info` sheet)
```json
{ "examTitle": "…", "subject": "English", "grade": 8, "track": "General", "term": "Term 1",
  "teacher": "…", "author": "…", "examCode": "A", "durationMinutes": 30, "passingPercent": 50,
  "calculatorAllowed": false, "allowBacktrack": true, "shuffleQuestions": false, "shuffleOptions": true,
  "requireSeenAll": true, "showReviewAfterSubmit": true, "defaultLanguage": "en",
  "extraInstructions": ["Part 4 (Writing) is completed on paper."],
  "school": "Zayed Educational Complex – Suhaila", "academicYear": "2026 / 2027" }
```

### Question
```json
{ "q_num": 7, "section_part": "Part 3A: Reading", "topic": "Main idea",
  "outcome_code": "EN8.R1", "outcome_label": "Identify the main idea",
  "passage_id": "P2", "en": "What is the main idea of the text?", "ar": "",
  "image_url": "/uploads/exam-images/9f1c….png",
  "options": ["…", "…", "…"], "correct": 1, "marks": 3,
  "feedback": "Worked solution shown after submitting", "hint": "Optional clue" }
```
- `options`: 2–4 strings, in A, B, C, D order. `correct`: 0-based index into `options`.
- `options_ar` (optional): Arabic text of each answer, parallel to `options` (`''` = none) — from the STEM template's `Option_A_AR`…`Option_D_AR` columns. The exam shows English and Arabic stacked.
- `option_images` (optional): array parallel to `options`; each entry is a picture URL or `''`. An answer may be a picture only
  (`options[k] === ''` with `option_images[k]` set), text only, or both. Every answer must have text or a picture.
  In Excel these come from the `Image_A`…`Image_D` columns (a picture placed in `Option_X` is also accepted as that answer's picture).
- `en` and/or `ar` (at least one). Arabic-only → the engine renders the stem **and** options RTL.
- Text may contain KaTeX (`$…$`, `$$…$$`) and simple HTML. Escaped `\$` = a literal dollar sign.
  **Sanitize HTML on the server** (allow basic formatting tags only; strip scripts/handlers).

### Attempt `answers_json`
Keyed by original question index; `picked` = original option index (shuffles already undone by the engine):
```json
{ "0": { "picked": 0, "marked": false, "order": 0 }, "1": { "picked": null, "marked": true, "order": 3 } }
```

## Excel templates (one header-aware parser for all)
| Family | File | For subjects | Question columns |
|---|---|---|---|
| English | `English_Exam_Template.xlsx` | English | `Q_Num, Section_Part, Topic, Outcome_Code, Outcome_Label, Passage_ID, Question_EN, Image, Option_A–D, Correct_Option, Marks, Feedback, Hint` |
| STEM bilingual | `STEM_Exam_Template.xlsx` | Mathematics, Science, Physics, Chemistry, Biology, Computer Science, Other | same + `Question_AR` and `Option_A_AR`–`Option_D_AR` |
| Arabic & Humanities | `Arabic_Exam_Template.xlsx` | Arabic, Islamic Education, Social Studies | `Question_AR` instead of `Question_EN` |

Sheets: `Exam_Info` (Field | Value), `Passages`, `Questions`, `Instructions_تعليمات`.
Pictures are extracted automatically from: anchored/floating pictures (matched by anchor row), Excel 365
"Place in Cell" pictures (rich-value metadata), WPS `cellimages.xml`, or a URL/data URI typed in the `Image` cell.

The website generates templates on the fly with the selected term/grade/subject pre-filled
(`public/js/shared/excel-templates.js → buildTemplate(family, { term, grade, track, subject, teacher })`);
static Term 1 copies are in `templates/`.
