-- =====================================================================
--  Zayed Educational Complex – Suhaila | Exam Training Platform (Grades 5–12)
--  SQLite schema (also portable to PostgreSQL/MySQL with minor type changes)
--  Includes the 3-Term add-on (exams.term + settings.active_term).
-- =====================================================================
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- students: privacy-preserving roster (IDs only, NO names)
-- Seed with data/seed_students.sql (526 rows, 30 sections).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  student_id      TEXT PRIMARY KEY,              -- normalized: Western digits, trimmed, UPPERCASE (e.g. 123456SHJ)
  grade_num       INTEGER NOT NULL CHECK (grade_num BETWEEN 5 AND 12),
  grade_label_en  TEXT NOT NULL,                 -- "Grade 5" … "Grade 12"
  grade_label_ar  TEXT NOT NULL,                 -- "الصف الخامس" … "الصف الثاني عشر"
  track           TEXT NOT NULL CHECK (track IN ('General','Advanced')),
  section         TEXT NOT NULL                  -- exact Arabic sheet name, e.g. "ثامن 1", "تاسع متقدم 2"
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(grade_num, track, section);

-- ---------------------------------------------------------------------
-- teacher_assignments: who teaches which subject in which class (seed: data/seed_teachers.sql)
-- Used for the teacher name list, default target sections and "Assigned_Teachers" in reports.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_assignments (
  teacher_name  TEXT NOT NULL,
  subject       TEXT NOT NULL,
  class_code    TEXT NOT NULL,                   -- as in the school list: "5/1", "9G1", "10A2"
  grade_num     INTEGER NOT NULL,
  track         TEXT NOT NULL,
  section       TEXT NOT NULL,                   -- roster section name ("11A2" maps to "الحادي عشر متقدم 1")
  PRIMARY KEY (teacher_name, subject, class_code)
);

-- Subjects per grade/track are fixed by the MOE timetable (see docs/EXAM_BLUEPRINTS.md):
-- Science only in Grades 5–8, 9 General, 10 General; Physics/Chemistry/Biology elsewhere in cycle 3.
-- The API must reject exams for a subject not taught in the chosen grade/track (error "subject_not_taught").

-- ---------------------------------------------------------------------
-- exams
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
  id                    TEXT PRIMARY KEY,         -- UUID
  title                 TEXT NOT NULL,
  subject               TEXT NOT NULL CHECK (subject IN ('Mathematics','Science','English','Arabic','Islamic Education',
                                       'Social Studies','Physics','Chemistry','Biology','Computer Science','Other')),
  grade_num             INTEGER NOT NULL CHECK (grade_num BETWEEN 5 AND 12),
  track                 TEXT NOT NULL CHECK (track IN ('General','Advanced','All')),
  term                  TEXT NOT NULL DEFAULT 'Term 1' CHECK (term IN ('Term 1','Term 2','Term 3')),
  target_sections_json  TEXT NOT NULL DEFAULT '["ALL"]',  -- ["ALL"] or ["ثامن 1","ثامن 3"]
  teacher_name          TEXT NOT NULL,
  config_json           TEXT NOT NULL,            -- SwiftAssess EXAM_CONFIG (see docs/DATA_CONTRACTS.md)
  passages_json         TEXT NOT NULL DEFAULT '{}', -- { "P1": { "title": "", "en": "", "ar": "" } }
  questions_json        TEXT NOT NULL,            -- ordered array of question objects (see docs/DATA_CONTRACTS.md)
  is_published          INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at            TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exams_target ON exams(grade_num, track, term, is_published);

-- Migration for databases created before the 3-Term add-on (run once; ignore "duplicate column" error):
-- ALTER TABLE exams ADD COLUMN term TEXT NOT NULL DEFAULT 'Term 1';

-- ---------------------------------------------------------------------
-- attempts: unlimited retries; attempt_number increments per (student_id, exam_id)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attempts (
  id                  TEXT PRIMARY KEY,           -- UUID
  exam_id             TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id          TEXT NOT NULL REFERENCES students(student_id),
  grade_num           INTEGER NOT NULL,           -- snapshot at submission time
  track               TEXT NOT NULL,
  section             TEXT NOT NULL,
  attempt_number      INTEGER NOT NULL,
  score_gained        REAL NOT NULL,
  total_marks         REAL NOT NULL,
  percentage          REAL NOT NULL,
  passed              INTEGER NOT NULL,
  time_spent_seconds  INTEGER NOT NULL,
  answers_json        TEXT NOT NULL,              -- keyed by ORIGINAL (unshuffled) question index
  submitted_at        TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, exam_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_attempts_exam ON attempts(exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id);

-- ---------------------------------------------------------------------
-- settings: key/value. PINs are stored ONLY as salted hashes and are never sent to the browser.
--   admin_pin_hash   -> hash of default 2026
--   teacher_pin_hash -> hash of default 5113
--   active_term      -> 'Term 1' | 'Term 2' | 'Term 3'
--   session_secret   -> random secret for signing session cookies
-- The backend must write the PIN hashes at first start (see docs/HANDOFF.md §4).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('active_term', 'Term 1');

-- ---------------------------------------------------------------------
-- Handy views for results & reports
-- ---------------------------------------------------------------------
-- Best attempt per (student, exam): highest percentage, ties broken by shortest time then earliest.
CREATE VIEW IF NOT EXISTS v_best_attempts AS
SELECT * FROM (
  SELECT a.*,
         COUNT(*)        OVER (PARTITION BY a.student_id, a.exam_id) AS attempts_count,
         MAX(a.submitted_at) OVER (PARTITION BY a.student_id, a.exam_id) AS last_attempt_at,
         ROW_NUMBER()    OVER (PARTITION BY a.student_id, a.exam_id
                               ORDER BY a.percentage DESC, a.time_spent_seconds ASC, a.submitted_at ASC) AS rn
  FROM attempts a
) WHERE rn = 1;

-- Every student × every published exam visible to them (includes 0-attempt rows) — Report 1, Sheet 1.
CREATE VIEW IF NOT EXISTS v_student_exam_matrix AS
SELECT e.term, s.grade_num, s.track, s.section, s.student_id,
       e.id AS exam_id, e.subject, e.title AS exam_title,
       COALESCE(b.attempts_count, 0)  AS attempts_count,
       b.score_gained                 AS highest_mark,
       e_total.total_marks            AS total_marks,
       b.percentage                   AS highest_percent,
       CASE WHEN b.id IS NULL THEN 'Not Attempted'
            WHEN b.passed = 1 THEN 'Passed' ELSE 'Failed' END AS status,
       b.last_attempt_at              AS last_attempt_date
FROM students s
JOIN exams e
  ON e.is_published = 1
 AND e.grade_num = s.grade_num
 AND (e.track = 'All' OR e.track = s.track)
 AND (e.target_sections_json LIKE '%"ALL"%' OR e.target_sections_json LIKE '%"' || s.section || '"%')
LEFT JOIN (SELECT id, COALESCE((SELECT SUM(json_extract(q.value,'$.marks')) FROM json_each(exams.questions_json) q),0) AS total_marks FROM exams) e_total
  ON e_total.id = e.id
LEFT JOIN v_best_attempts b ON b.exam_id = e.id AND b.student_id = s.student_id;
