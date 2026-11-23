// Roster workbook parser (Grades 5–12). Isomorphic: Node (require) and browser (window.RosterParser).
// parseRosterWorkbook(bufferOrArrayBuffer) -> { students:[…], sections:[…], notes:[…] }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('exceljs'));
  else root.RosterParser = factory(root.ExcelJS);
})(typeof self !== 'undefined' ? self : this, function (ExcelJS) {
'use strict';
const SKIP = ['أول 1', 'أول 2', 'ثاني 1', 'ثاني 2', 'ثالث 1', 'ثالث 2', 'رابع 1', 'رابع 2', 'غير مطابق'];
const GRADES = [['الحادي عشر', 11], ['الثاني عشر', 12], ['خامس', 5], ['سادس', 6], ['سابع', 7], ['ثامن', 8], ['تاسع', 9], ['عاشر', 10]];
const AR_LABEL = { 5: 'الصف الخامس', 6: 'الصف السادس', 7: 'الصف السابع', 8: 'الصف الثامن', 9: 'الصف التاسع', 10: 'الصف العاشر', 11: 'الصف الحادي عشر', 12: 'الصف الثاني عشر' };

// Normalizes any typed / stored ID: Arabic-Indic & Persian digits -> 0-9, strip spaces, uppercase, drop ".0".
function normalizeId(v) {
  if (v == null) return '';
  if (typeof v === 'object') v = v.text ?? v.result ?? (v.richText ? v.richText.map(t => t.text).join('') : '');
  let s = String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  s = s.replace(/\s+/g, '').toUpperCase();
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');
  return s;
}
const gradeOf = name => (GRADES.find(([p]) => name.startsWith(p)) || [])[1];
const trackOf = name => (name.includes('متقدم') ? 'Advanced' : 'General');

async function parseRosterWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const students = new Map(), sections = [], notes = [];
  for (const ws of wb.worksheets) {
    const name = ws.name.trim();
    if (SKIP.includes(name)) { notes.push(`Skipped sheet (outside Grades 5–12): ${name}`); continue; }
    const grade = gradeOf(name);
    if (!grade) { notes.push(`Unrecognised sheet skipped: ${name}`); continue; }
    const track = trackOf(name);
    let count = 0;
    ws.eachRow(row => row.eachCell(cell => {
      const id = normalizeId(cell.value);
      if (!id || id === 'رقم الطالب' || !/^[0-9A-Z]+$/.test(id)) return;
      if (students.has(id)) { notes.push(`Duplicate ID ${id} in ${name} (kept in ${students.get(id).section})`); return; }
      students.set(id, { student_id: id, grade_num: grade, grade_label_en: `Grade ${grade}`, grade_label_ar: AR_LABEL[grade], track, section: name });
      count++;
    }));
    sections.push({ section: name, grade_num: grade, track, student_count: count });
  }
  return { students: [...students.values()], sections, notes };
}

return { parseRosterWorkbook, normalizeId, SKIP, AR_LABEL };
});
