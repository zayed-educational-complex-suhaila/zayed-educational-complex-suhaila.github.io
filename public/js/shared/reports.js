// Results analytics + styled .xlsx report builders. Isomorphic (Node: require, browser: window.Reports).
// All builders take plain arrays so the same code runs on the server (from SQL rows) or in the browser.
//   students: [{student_id, grade_num, track, section}]
//   exams:    [{id, title, subject, grade_num, track, term, target_sections:[], teacher_name, is_published, total_marks, created_at}]
//   attempts: [{id, exam_id, student_id, grade_num, track, section, attempt_number, score_gained, total_marks,
//               percentage, passed, time_spent_seconds, submitted_at}]
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('exceljs'), require('./catalog.js'));
  else root.Reports = factory(root.ExcelJS, root.Catalog);
})(typeof self !== 'undefined' ? self : this, function (ExcelJS, Catalog) {
'use strict';
const CORE_SUBJECTS = ['Mathematics', 'Science', 'English', 'Arabic', 'Islamic Education', 'Social Studies'];
const EXTRA_SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Computer Science', 'Other'];
const GRADE_TRACKS = [];
for (let g = 5; g <= 12; g++) { GRADE_TRACKS.push({ grade_num: g, track: 'General' }); if (g >= 9) GRADE_TRACKS.push({ grade_num: g, track: 'Advanced' }); }

const round1 = n => Math.round(n * 10) / 10;
// "YYYY-MM-DD HH:MM" with Western digits regardless of locale
const fmtDate = d => { if (!d) return ''; const x = new Date(String(d).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(d) ? '' : (String(d).includes('T') ? '' : 'Z'))); if (isNaN(x)) return String(d); const p = n => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}`; };
const fmtTime = s => { s = Math.max(0, s | 0); const m = Math.floor(s / 60), x = s % 60; return `${m}:${String(x).padStart(2, '0')}`; };

const examVisibleTo = (e, s) => e.grade_num === s.grade_num && (e.track === 'All' || e.track === s.track) &&
  (!e.target_sections || !e.target_sections.length || e.target_sections.includes('ALL') || e.target_sections.includes(s.section));

// Best attempt per (student, exam): highest %, then shortest time, then earliest.
function bestByStudentExam(attempts) {
  const map = new Map();
  for (const a of attempts) {
    const k = a.student_id + '|' + a.exam_id;
    const cur = map.get(k);
    if (!cur) { map.set(k, { best: a, count: 1, last: a.submitted_at, all: [a] }); continue; }
    cur.count++; cur.all.push(a);
    if (String(a.submitted_at) > String(cur.last)) cur.last = a.submitted_at;
    const b = cur.best;
    if (a.percentage > b.percentage || (a.percentage === b.percentage && (a.time_spent_seconds < b.time_spent_seconds ||
      (a.time_spent_seconds === b.time_spent_seconds && String(a.submitted_at) < String(b.submitted_at))))) cur.best = a;
  }
  for (const v of map.values()) v.all.sort((x, y) => x.attempt_number - y.attempt_number);
  return map;
}

function filterScope(students, f = {}) {
  return students.filter(s => (!f.grade || s.grade_num === Number(f.grade)) && (!f.track || f.track === 'ALL' || s.track === f.track) && (!f.section || f.section === 'ALL' || s.section === f.section));
}

// ---------------------------------------------------------------- Report 1 data
function studentPerformance({ term, students, exams, attempts, filters = {} }) {
  const pubExams = exams.filter(e => e.is_published && (term === 'ALL' || e.term === term) && (!filters.subject || filters.subject === 'ALL' || e.subject === filters.subject || (filters.subject === 'Science' && Catalog && Catalog.departmentOf(e.subject) === 'Science')));
  const examIds = new Set(pubExams.map(e => e.id));
  const best = bestByStudentExam(attempts.filter(a => examIds.has(a.exam_id)));
  const scope = filterScope(students, filters).sort((a, b) => a.grade_num - b.grade_num || a.section.localeCompare(b.section, 'ar') || a.student_id.localeCompare(b.student_id));
  const details = [], summary = [];
  const subjects = [...new Set(pubExams.map(e => e.subject))].sort((a, b) => (CORE_SUBJECTS.concat(EXTRA_SUBJECTS).indexOf(a)) - (CORE_SUBJECTS.concat(EXTRA_SUBJECTS).indexOf(b)));
  for (const s of scope) {
    const mine = pubExams.filter(e => examVisibleTo(e, s));
    let totalAttempts = 0, attempted = 0, pctSum = 0; const bySubj = {};
    for (const e of mine) {
      const b = best.get(s.student_id + '|' + e.id);
      const row = {
        Term: e.term, Grade: s.grade_num, Track: s.track, Section: s.section, Student_ID: s.student_id, Subject: e.subject, Exam_Title: e.title,
        Attempts_Count: b ? b.count : 0, Highest_Mark: b ? b.best.score_gained : '', Total_Marks: e.total_marks,
        Highest_Percent: b ? round1(b.best.percentage) : '', Status: b ? (b.best.passed ? 'Passed' : 'Failed') : 'Not Attempted',
        Last_Attempt_Date: b ? fmtDate(b.last) : '',
      };
      details.push(row);
      const sj = bySubj[e.subject] = bySubj[e.subject] || { attempts: 0, highest: null };
      if (b) { totalAttempts += b.count; attempted++; pctSum += b.best.percentage; sj.attempts += b.count; sj.highest = Math.max(sj.highest ?? -1, b.best.score_gained); }
    }
    const row = {
      Term: term === 'ALL' ? 'All Terms' : term, Grade: s.grade_num, Track: s.track, Section: s.section, Student_ID: s.student_id,
      Total_Attempts: totalAttempts, Exams_Attempted: attempted, Total_Available_Exams: mine.length,
      Avg_Highest_Percent: attempted ? round1(pctSum / attempted) : '',
    };
    for (const sub of subjects) { row[`${sub}_Attempts`] = bySubj[sub] ? bySubj[sub].attempts : 0; row[`${sub}_Highest_Mark`] = bySubj[sub] && bySubj[sub].highest !== null ? bySubj[sub].highest : ''; }
    summary.push(row);
  }
  return { details, summary, subjects, participated: summary.filter(r => r.Total_Attempts > 0).length, scopeCount: scope.length };
}

// ---------------------------------------------------------------- Report 2 data
function teacherUploads({ term, exams, attempts }) {
  const tExams = exams.filter(e => term === 'ALL' || e.term === term);
  const subjectsWithUploads = new Set(tExams.map(e => e.subject));
  // Columns = every subject taught in at least one grade/track (catalog), + any other subject that has uploads
  const taughtAll = Catalog ? Catalog.ALL_SUBJECTS : CORE_SUBJECTS;
  const subjects = taughtAll.concat(EXTRA_SUBJECTS.filter(s => !taughtAll.includes(s) && subjectsWithUploads.has(s)));
  const isTaught = (sub, g, t) => (Catalog ? Catalog.isTaught(sub, g, t) : CORE_SUBJECTS.includes(sub));
  const details = [], matrix = [];
  let uploadedCells = 0, totalCells = 0;
  for (const gt of GRADE_TRACKS) {
    const mrow = { 'Grade & Track': `Grade ${gt.grade_num} ${gt.track}` };
    const dept = s => (Catalog ? Catalog.departmentOf(s) : s);
    for (const sub of subjects) {
      const taught = isTaught(sub, gt.grade_num, gt.track);
      const list = tExams.filter(e => e.grade_num === gt.grade_num && e.subject === sub && (e.track === gt.track || e.track === 'All'));
      if (!taught && !list.length) { mrow[sub] = 'N/A'; continue; }
      const ids = new Set(list.map(e => e.id));
      const at = attempts.filter(a => ids.has(a.exam_id) && a.track === gt.track);
      const teachers = [...new Set(list.map(e => e.teacher_name))];
      const assigned = Catalog ? Catalog.teachersFor(sub, gt.grade_num, gt.track) : [];
      const status = list.length ? 'Uploaded' : 'Not Uploaded';
      if (taught) { totalCells++; if (list.length) uploadedCells++; }
      mrow[sub] = list.length ? `Uploaded (${list.length}) - ${teachers.join(', ')}` : `Not Uploaded${assigned.length ? ' - ' + assigned.join(', ') : ''}`;
      details.push({
        Term: term === 'ALL' ? 'All Terms' : term, Grade: gt.grade_num, Track: gt.track, Department: dept(sub), Subject: sub, Upload_Status: status, Exams_Count: list.length,
        'Teacher_Name(s)': teachers.join(', '), Assigned_Teachers: assigned.join(', '), Exam_Titles: list.map(e => e.title).join(' | '),
        Last_Upload_Date: list.length ? fmtDate(list.map(e => e.created_at).sort().pop()) : '',
        Unique_Students_Attempted: new Set(at.map(a => a.student_id)).size, Total_Attempts: at.length,
        Notes: taught ? '' : 'Subject not taught in this grade/track',
      });
    }
    matrix.push(mrow);
  }
  // "Uploaded Subjects X / Y" counts only subjects actually taught in each grade/track (no Science in most of cycle 3)
  return { matrix, details, subjects, uploadedCells, totalCells };
}

// ---------------------------------------------------------------- workbook helpers
const NAVY = 'FF89191E', GREEN = 'FFE2F1EA', GREEN_T = 'FF2E7D5E', RED = 'FFFCE1E4', RED_T = 'FFA8253A', AMBER = 'FFFFF3D6';
function addTable(wb, name, rows, opts = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1, xSplit: opts.freezeCols || 0 }] });
  const cols = opts.columns || (rows[0] ? Object.keys(rows[0]) : ['(no data)']);
  ws.columns = cols.map(c => ({ header: c, key: c }));
  rows.forEach(r => ws.addRow(cols.map(c => r[c] ?? '')));
  const head = ws.getRow(1);
  head.height = 22;
  head.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  // auto-fit widths
  cols.forEach((c, i) => {
    let w = String(c).length;
    rows.forEach(r => { const v = r[c]; if (v !== undefined && v !== null) w = Math.max(w, ...String(v).split('\n').map(x => x.length)); });
    ws.getColumn(i + 1).width = Math.min(60, Math.max(9, w + 2));
  });
  ws.eachRow((row, i) => { if (i > 1) row.eachCell(c => { c.border = { bottom: { style: 'hair', color: { argb: 'FFEADFD3' } } }; c.alignment = { vertical: 'middle', wrapText: false }; }); });
  if (opts.statusCol) {
    const ci = cols.indexOf(opts.statusCol) + 1;
    ws.eachRow((row, i) => {
      if (i === 1 || !ci) return; const c = row.getCell(ci), v = String(c.value);
      if (/^(Passed|Uploaded)/.test(v)) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }; c.font = { color: { argb: GREEN_T }, bold: true }; }
      else if (/^(Failed)/.test(v)) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER } }; c.font = { color: { argb: 'FF8A5A00' }, bold: true }; }
      else if (/^(Not )/.test(v)) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } }; c.font = { color: { argb: RED_T } }; }
    });
  }
  return ws;
}
function colorMatrix(ws) {
  ws.eachRow((row, i) => {
    if (i === 1) return;
    row.getCell(1).font = { bold: true, color: { argb: NAVY } };
    row.eachCell((c, ci) => {
      if (ci === 1) return; const v = String(c.value);
      if (v === 'N/A') { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F1EE' } }; c.font = { color: { argb: 'FF9A9A90' }, italic: true }; }
      else if (v.startsWith('Uploaded')) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }; c.font = { color: { argb: GREEN_T }, bold: true }; }
      else { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } }; c.font = { color: { argb: RED_T } }; }
      c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    });
    row.height = 30;
  });
}
const newWb = () => { const wb = new ExcelJS.Workbook(); wb.creator = 'Zayed Educational Complex – Suhaila'; wb.created = new Date(); return wb; };
const termTag = term => (term === 'ALL' ? 'All_Terms' : String(term).replace(/\s+/g, '_'));

function buildStudentPerformanceWorkbook(input, wb = newWb()) {
  const r = studentPerformance(input);
  addTable(wb, 'Student_Exam_Details', r.details, { statusCol: 'Status', freezeCols: 5, columns: ['Term', 'Grade', 'Track', 'Section', 'Student_ID', 'Subject', 'Exam_Title', 'Attempts_Count', 'Highest_Mark', 'Total_Marks', 'Highest_Percent', 'Status', 'Last_Attempt_Date'] });
  const sumCols = ['Term', 'Grade', 'Track', 'Section', 'Student_ID', 'Total_Attempts', 'Exams_Attempted', 'Total_Available_Exams', 'Avg_Highest_Percent', ...r.subjects.flatMap(s => [`${s}_Attempts`, `${s}_Highest_Mark`])];
  addTable(wb, 'Student_Summary', r.summary, { freezeCols: 5, columns: sumCols });
  return { wb, filename: `Student_Attempts_Highest_Marks_${termTag(input.term)}.xlsx`, data: r };
}
function buildTeacherUploadsWorkbook(input, wb = newWb()) {
  const r = teacherUploads(input);
  const lab = s => (Catalog && Catalog.departmentOf(s) !== s ? `Science: ${s}` : s);
  const rows = r.matrix.map(m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k === 'Grade & Track' ? k : lab(k), v])));
  const ws = addTable(wb, 'Upload_Matrix', rows, { freezeCols: 1, columns: ['Grade & Track', ...r.subjects.map(lab)] });
  colorMatrix(ws); r.subjects.forEach((_, i) => (ws.getColumn(i + 2).width = 30));
  addTable(wb, 'Upload_Details_List', r.details, { statusCol: 'Upload_Status', columns: ['Term', 'Grade', 'Track', 'Department', 'Subject', 'Upload_Status', 'Exams_Count', 'Teacher_Name(s)', 'Assigned_Teachers', 'Exam_Titles', 'Last_Upload_Date', 'Unique_Students_Attempted', 'Total_Attempts', 'Notes'] });
  return { wb, filename: `Teacher_Uploads_Status_${termTag(input.term)}.xlsx`, data: r };
}
function buildFullWorkbook(input) {
  const wb = newWb();
  buildStudentPerformanceWorkbook(input, wb);
  buildTeacherUploadsWorkbook(input, wb);
  return { wb, filename: `Full_Admin_Report_${termTag(input.term)}.xlsx` };
}
// Generic results export (teacher/admin "Export filtered results")
function buildTableWorkbook(sheetName, rows, columns, filename, statusCol) {
  const wb = newWb();
  addTable(wb, sheetName, rows, { columns, statusCol });
  return { wb, filename };
}

return { CORE_SUBJECTS, EXTRA_SUBJECTS, GRADE_TRACKS, examVisibleTo, bestByStudentExam, studentPerformance, teacherUploads,
  buildStudentPerformanceWorkbook, buildTeacherUploadsWorkbook, buildFullWorkbook, buildTableWorkbook, fmtDate, fmtTime };
});
