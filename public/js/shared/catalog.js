// School catalog for 2026–2027 Term 1 (Grades 5–12): which subjects each grade/track sits, the ELECTRONIC part of
// every end-of-term exam (question count, marks, options, duration, calculator), the official exam dates, and teachers.
// Sources: MOE "End of Term 1 Exam Schedules 2026-2027" (timetable + calculator guidelines),
//          the school's exam structures folder (الهياكل - Structures), and the teacher list workbook.
// Isomorphic: browser -> window.Catalog (needs teachers-data.js loaded first), Node -> require().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./teachers-data.js'));
  else root.Catalog = factory(root.TEACHERS_DATA);
})(typeof self !== 'undefined' ? self : this, function (TEACHERS_DATA) {
'use strict';

// ---------------------------------------------------------------- subjects per grade & track (MOE timetable)
// Science exists only in Grades 5–8, 9 General and 10 General. Cycle 3 Advanced and Grades 11–12 General take
// Physics / Chemistry / Biology instead.
const CORE = ['Mathematics', 'English', 'Arabic', 'Islamic Education', 'Social Studies'];
const CLASS_SUBJECTS = {
  '5|General': [...CORE, 'Science'], '6|General': [...CORE, 'Science'], '7|General': [...CORE, 'Science'], '8|General': [...CORE, 'Science'],
  '9|General': [...CORE, 'Science'], '9|Advanced': [...CORE, 'Physics', 'Biology'],
  '10|General': [...CORE, 'Science'], '10|Advanced': [...CORE, 'Physics', 'Chemistry'],
  '11|General': [...CORE, 'Chemistry', 'Biology'], '11|Advanced': [...CORE, 'Physics', 'Chemistry', 'Biology'],
  '12|General': [...CORE, 'Physics', 'Chemistry', 'Biology'], '12|Advanced': [...CORE, 'Physics', 'Chemistry', 'Biology'],
};
const ORDER = ['Mathematics', 'English', 'Arabic', 'Islamic Education', 'Social Studies', 'Science', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Other'];
const sortSubjects = a => [...a].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
const GRADE_TRACKS = Object.keys(CLASS_SUBJECTS).map(k => { const [g, t] = k.split('|'); return { grade_num: +g, track: t }; });

/** Subjects taught in a grade/track. track 'All' (or empty) -> union over the grade's tracks. */
function subjectsFor(grade, track) {
  grade = Number(grade);
  if (track && track !== 'All' && track !== 'ALL') return sortSubjects(CLASS_SUBJECTS[`${grade}|${track}`] || []);
  return sortSubjects([...new Set(Object.entries(CLASS_SUBJECTS).filter(([k]) => +k.split('|')[0] === grade).flatMap(([, v]) => v))]);
}
const isTaught = (subject, grade, track) => subjectsFor(grade, track).includes(subject);
const ALL_SUBJECTS = sortSubjects([...new Set(Object.values(CLASS_SUBJECTS).flat())]);

// ---------------------------------------------------------------- official exam days (Term 1, electronic slot)
const SCHEDULE = {
  'Mathematics': { date: '2026-11-25', format: 'paper+electronic' },
  'English': { date: '2026-11-26', format: 'paper+electronic' },
  'Chemistry': { date: '2026-11-27', format: 'electronic' },
  'Science': { date: '2026-12-07', format: 'paper+electronic' },
  'Physics': { date: '2026-12-07', format: 'paper+electronic' },
  'Arabic': { date: '2026-12-08', format: 'paper+electronic' },
  'Islamic Education': { date: '2026-12-09', format: 'electronic' },
  'Social Studies': { date: '2026-12-10', format: 'electronic' },
  'Biology': { date: '2026-12-11', format: 'electronic' },
};
function electronicTime(subject, grade) {
  const fullyElectronic = SCHEDULE[subject] && SCHEDULE[subject].format === 'electronic';
  if (Number(grade) === 12 && !['Chemistry', 'Biology'].includes(subject)) return fullyElectronic ? '12:00–14:00' : '13:30–14:30';
  return fullyElectronic ? '09:00–11:00' : '10:30–11:30';
}

// ---------------------------------------------------------------- electronic-part blueprints (from the structures)
// questions = electronic multiple-choice questions only (paper / written parts are not on this platform).
function blueprint(subject, grade, track) {
  grade = Number(grade);
  const calcScience = true; // MOE guideline: scientific calculator permitted for Science/Physics/Chemistry/Biology in all grades
  const base = { subject, grade, track, options: 4, calculator: false, parts: [], paper: '', source: '' };
  switch (subject) {
    case 'Mathematics': return { ...base, questions: 20, marks: null, marksEach: '2–4 (varies)', duration: 60, calculator: grade >= 9,
      // totals per structure: 26 questions (6 free-response) in G8, G10 General, G11 General, G12 Advanced; 25 (5 FR) elsewhere
      paper: `${['8|General', '10|General', '11|General', '12|Advanced'].includes(`${grade}|${track}`) ? 6 : 5} free-response questions on paper`,
      parts: [{ label: 'Multiple Choice', count: 20 }], source: 'Mathematics structures: 20 MCQ (electronic) + free-response (paper) in every grade' };
    case 'English': { const twoOpt = grade <= 6;
      return { ...base, questions: 26, marks: 60, marksEach: '2–3', duration: 60, options: 3,
        parts: [{ label: 'Part 1: Vocabulary', count: 5, marks: 2, options: twoOpt ? 2 : 3 }, { label: 'Part 2: Grammar', count: 5, marks: 2, options: 3 },
          { label: 'Part 3A: Reading', count: 8, marks: 3, options: 3 }, { label: 'Part 3B: Reading', count: 8, marks: 2, options: 3 }],
        paper: grade === 12 ? 'Writing (40 marks) is a separate electronic writing task — not multiple choice' : 'Writing (40 marks) is on paper',
        source: 'English EoT1 test specifications (Reading 60 / Writing 40)' }; }
    case 'Arabic': return { ...base, questions: grade === 6 ? 18 : 20, marks: 60, marksEach: grade === 6 ? '2–4' : '3', duration: 60,
      parts: grade === 6 ? [{ label: 'Reading texts', count: 18 }] : [{ label: 'النص السردي', count: 10, marks: 3 }, { label: 'النص المعلوماتي', count: 10, marks: 3 }],
      paper: 'Comprehension, language skills and writing (40 marks) on paper', source: grade === 6 ? 'Platform-Arabic-T1-G6 (33 questions: 15 paper + 18 electronic)' : 'Arabic structure: 40 paper + 60 electronic (MCQ)' };
    case 'Islamic Education': return { ...base, questions: 27, marks: 100, marksEach: '2, 3 or 4', duration: 120, parts: [{ label: 'Multiple Choice', count: 27 }], paper: 'None — fully electronic', source: 'Islamic Education structure: 27 questions, 120 min, electronic' };
    case 'Social Studies': return { ...base, questions: 25, marks: 100, marksEach: '4', duration: 120, calculator: true, parts: [{ label: 'Multiple Choice', count: 25, marks: 4 }], paper: 'None — fully electronic', source: 'Social Studies structure: 25 × 4 marks, 120 min, electronic' };
    case 'Science': return { ...base, questions: 20, marks: 60, marksEach: '3', duration: 60, calculator: calcScience, parts: [{ label: 'Multiple Choice', count: 20, marks: 3 }],
      paper: grade === 10 ? '5 free-response questions on paper' : '4 free-response questions on paper', source: 'Science structure: 20 MCQ (electronic) + free-response (paper)' };
    case 'Physics': return { ...base, questions: 16, marks: grade === 12 && track === 'General' ? 64 : null, marksEach: grade === 12 && track === 'General' ? '4' : '2–4', duration: 60, calculator: calcScience,
      parts: [{ label: 'Multiple Choice (Q1–Q16)', count: 16 }], paper: 'Remaining questions (Q17 onward) on paper', source: 'Physics structure: Q1–Q16 MCQ' };
    case 'Chemistry': { const g12g = grade === 12 && track === 'General';
      return { ...base, questions: g12g ? 25 : 30, marks: 100, marksEach: g12g ? '4' : (grade === 11 ? '2–4' : '3–4'), duration: 120, calculator: calcScience,
        parts: [{ label: 'Multiple Choice', count: g12g ? 25 : 30 }], paper: 'None — fully electronic', source: g12g ? 'Chemistry 12 General: 25 × 4' : 'Chemistry structure: 30 questions, 120 min, electronic' }; }
    case 'Biology': return { ...base, questions: 30, marks: 100, marksEach: '3–4', duration: 120, calculator: calcScience, parts: [{ label: 'Multiple Choice', count: 30 }], paper: 'None — fully electronic',
      source: grade === 11 && track === 'Advanced' ? 'No Grade 11 Advanced structure supplied — using the 30-question Biology format of the other grades' : 'Biology structure: 30 questions, 120 min, electronic' };
    default: return { ...base, questions: null, marks: null, marksEach: '', duration: 60, source: 'No structure' };
  }
}

// ---------------------------------------------------------------- teachers
const T = TEACHERS_DATA || { teachers: [], assignments: [] };
const teacherNames = () => T.teachers.map(t => t.name);
const teacherSubjects = name => (T.teachers.find(t => t.name === name) || { subjects: [] }).subjects;
const assignmentsOf = name => T.assignments.filter(a => a.teacher === name);
/** Teachers assigned to a subject in a grade/track (track All -> any track). */
function teachersFor(subject, grade, track) {
  return [...new Set(T.assignments.filter(a => a.subject === subject && (!grade || a.grade_num === Number(grade)) && (!track || track === 'All' || track === 'ALL' || a.track === track)).map(a => a.teacher))];
}
/** Sections a teacher teaches for a subject (optionally within a grade/track). */
function sectionsOf(name, subject, grade, track) {
  return T.assignments.filter(a => a.teacher === name && (!subject || a.subject === subject) && (!grade || a.grade_num === Number(grade)) && (!track || track === 'All' || track === 'ALL' || a.track === track)).map(a => a.section);
}
/** Teacher of a given section & subject (first match), e.g. for reports. */
const teacherOfSection = (section, subject) => (T.assignments.find(a => a.section === section && a.subject === subject) || {}).teacher || '';

// ---------------------------------------------------------------- departments
// Physics, Chemistry and Biology count as Science: the school has 6 subject departments. Exams keep the specific
// branch (Physics / Chemistry / Biology / Science) because each branch has its own official blueprint.
const DEPARTMENTS = ['Mathematics', 'English', 'Arabic', 'Islamic Education', 'Social Studies', 'Science'];
const SCIENCE_BRANCHES = ['Science', 'Physics', 'Chemistry', 'Biology'];
const departmentOf = s => (SCIENCE_BRANCHES.includes(s) ? 'Science' : s);
const branchesOf = dept => (dept === 'Science' ? SCIENCE_BRANCHES : [dept]);
/** Teachers of a department (any branch), alphabetical. */
const teachersOfDepartment = dept => [...new Set(T.assignments.filter(a => departmentOf(a.subject) === dept).map(a => a.teacher))].sort((a, b) => a.localeCompare(b, 'ar'));
/** Departments a teacher belongs to. */
const departmentsOfTeacher = name => [...new Set(assignmentsOf(name).map(a => departmentOf(a.subject)))];

return { CLASS_SUBJECTS, GRADE_TRACKS, ALL_SUBJECTS, SCHEDULE, subjectsFor, isTaught, sortSubjects, blueprint, electronicTime,
  teacherNames, teacherSubjects, assignmentsOf, teachersFor, sectionsOf, teacherOfSection, TEACHERS: T,
  DEPARTMENTS, SCIENCE_BRANCHES, departmentOf, branchesOf, teachersOfDepartment, departmentsOfTeacher };
});
