// Bilingual (EN / AR) engine for the portal pages.
//  • persistent choice in localStorage('zec.lang'), flips <html lang/dir> instantly
//  • data-i18n="key"  -> textContent,  data-i18n-ph="key" -> placeholder,  data-i18n-title="key" -> title,
//    data-i18n-html="key" -> innerHTML (trusted dictionary strings only)
//  • numbers are ALWAYS Western digits (0–9); I18N.num() never uses Arabic-Indic digits
(function () {
'use strict';
const D = { en: {}, ar: {} };
const add = dict => { Object.assign(D.en, dict.en || {}); Object.assign(D.ar, dict.ar || {}); };
let lang = (() => { try { return localStorage.getItem('zec.lang') || 'ar'; } catch (_) { return 'ar'; } })();
const listeners = [];

add({
  en: {
    app_name: 'Exam Training Platform', school: 'Zayed Educational Complex – Suhaila', year: 'Academic Year 2026–2027', motto: 'With the Charter, we reach the horizons',
    role_admin: 'Administrator', role_teacher: 'Teacher', role_student: 'Student', role_guest: 'Guest',
    logout: 'Logout', back: 'Back', cancel: 'Cancel', confirm: 'Confirm', close: 'Close', save: 'Save', delete: 'Delete', edit: 'Edit', preview: 'Preview', search: 'Search', export_xlsx: 'Export to Excel (.xlsx)',
    all: 'All', all_grades: 'All grades', all_tracks: 'All tracks', all_sections: 'All sections', all_subjects: 'All subjects', all_exams: 'All exams', all_terms: 'All Terms',
    grade: 'Grade', track: 'Track', section: 'Section', sections: 'Sections', subject: 'Subject', exam: 'Exam', teacher: 'Teacher', term: 'Term', student_id: 'Student ID', students: 'Students', questions: 'Questions', marks: 'Marks', total_marks: 'Total marks', status: 'Status', date: 'Date', actions: 'Actions', attempts: 'Attempts', duration: 'Duration', minutes: 'min', no_limit: 'No limit',
    General: 'General', Advanced: 'Advanced', All: 'All',
    'Term 1': 'Term 1', 'Term 2': 'Term 2', 'Term 3': 'Term 3', active_term: 'Active term',
    Mathematics: 'Mathematics', Science: 'Science', English: 'English', Arabic: 'Arabic', 'Islamic Education': 'Islamic Education', 'Social Studies': 'Social Studies',
    Physics: 'Physics', Chemistry: 'Chemistry', Biology: 'Biology', 'Computer Science': 'Computer Science', Other: 'Other',
    published: 'Published', hidden: 'Hidden', passed: 'Passed', failed: 'Failed', not_attempted: 'Not Attempted',
    grade_n: 'Grade {n}', loading: 'Loading…', no_data: 'No data to show yet.', saved: 'Saved', error: 'Something went wrong',
    err_unauthorized: 'Your session has ended. Please sign in again.', err_network: 'Cannot reach the server. Check your connection.',
    demo_ribbon: 'DEMO MODE — data is stored only in this browser. The hosting developer switches this to the live server (js/config.js).',
    calc: 'Calculator', yes: 'Yes', no: 'No', view: 'View', open: 'Open', download: 'Download', copy: 'Copy', copied: 'Copied!',
  },
  ar: {
    app_name: 'منصة التدريب على الاختبارات', school: 'مجمع زايد التعليمي - سهيلة', year: 'العام الدراسي 2026–2027', motto: 'بالميثاق نبلغ الآفاق',
    role_admin: 'الإدارة', role_teacher: 'المعلم', role_student: 'الطالب', role_guest: 'زائر',
    logout: 'تسجيل الخروج', back: 'رجوع', cancel: 'إلغاء', confirm: 'تأكيد', close: 'إغلاق', save: 'حفظ', delete: 'حذف', edit: 'تعديل', preview: 'معاينة', search: 'بحث', export_xlsx: 'تصدير إلى Excel ‏(.xlsx)',
    all: 'الكل', all_grades: 'جميع الصفوف', all_tracks: 'جميع المسارات', all_sections: 'جميع الشعب', all_subjects: 'جميع المواد', all_exams: 'جميع الاختبارات', all_terms: 'جميع الفصول',
    grade: 'الصف', track: 'المسار', section: 'الشعبة', sections: 'الشعب', subject: 'المادة', exam: 'الاختبار', teacher: 'المعلم', term: 'الفصل الدراسي', student_id: 'رقم الطالب', students: 'الطلبة', questions: 'الأسئلة', marks: 'الدرجات', total_marks: 'الدرجة الكلية', status: 'الحالة', date: 'التاريخ', actions: 'إجراءات', attempts: 'المحاولات', duration: 'المدة', minutes: 'دقيقة', no_limit: 'بدون حد',
    General: 'عام', Advanced: 'متقدم', All: 'الكل',
    'Term 1': 'الفصل الدراسي 1', 'Term 2': 'الفصل الدراسي 2', 'Term 3': 'الفصل الدراسي 3', active_term: 'الفصل الحالي',
    Mathematics: 'الرياضيات', Science: 'العلوم', English: 'اللغة الإنجليزية', Arabic: 'اللغة العربية', 'Islamic Education': 'التربية الإسلامية', 'Social Studies': 'الدراسات الاجتماعية',
    Physics: 'الفيزياء', Chemistry: 'الكيمياء', Biology: 'الأحياء', 'Computer Science': 'علوم الحاسوب', Other: 'أخرى',
    published: 'منشور', hidden: 'مخفي', passed: 'ناجح', failed: 'لم يجتز', not_attempted: 'لم يحاول',
    grade_n: 'الصف {n}', loading: 'جارٍ التحميل…', no_data: 'لا توجد بيانات بعد.', saved: 'تم الحفظ', error: 'حدث خطأ ما',
    err_unauthorized: 'انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى.', err_network: 'تعذر الاتصال بالخادم. تحقق من الاتصال.',
    demo_ribbon: 'وضع العرض التجريبي — البيانات محفوظة في هذا المتصفح فقط، ويقوم مطوّر الاستضافة بتحويله إلى الخادم الفعلي (js/config.js).',
    calc: 'الآلة الحاسبة', yes: 'نعم', no: 'لا', view: 'عرض', open: 'فتح', download: 'تحميل', copy: 'نسخ', copied: 'تم النسخ!',
  },
});

const GRADE_AR = { 5: 'الخامس', 6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر', 11: 'الحادي عشر', 12: 'الثاني عشر' };
const toWestern = s => String(s ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

function t(key, vars) {
  let s = D[lang][key] ?? D.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
function apply(root = document) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  root.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach(e => { e.innerHTML = t(e.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); e.setAttribute('aria-label', t(e.dataset.i18nTitle)); });
  root.querySelectorAll('.lang-switch button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
}
function setLang(l) {
  lang = l === 'en' ? 'en' : 'ar';
  try { localStorage.setItem('zec.lang', lang); } catch (_) { /* */ }
  apply(); listeners.forEach(fn => fn(lang));
}
const num = (n, d = 0) => (n === null || n === undefined || n === '' || isNaN(n)) ? '—' : (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(d));
const pct = n => (n === null || n === undefined || isNaN(n)) ? '—' : `${Math.round(n * 10) / 10}%`;
const gradeLabel = g => lang === 'ar' ? `الصف ${GRADE_AR[g] || g}` : `Grade ${g}`;
// date/time: always "YYYY-MM-DD HH:MM" in Western digits
const date = (d, withTime = true) => { if (!d) return '—'; const x = new Date(d); if (isNaN(x)) return String(d); const p = n => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}` + (withTime ? ` ${p(x.getHours())}:${p(x.getMinutes())}` : ''); };
const dur = s => { s = Math.max(0, s | 0); const m = Math.floor(s / 60), x = s % 60; return `${m}:${String(x).padStart(2, '0')}`; };

window.I18N = { add, t, apply, setLang, get lang() { return lang; }, onChange: fn => listeners.push(fn), num, pct, gradeLabel, date, dur, toWestern, GRADE_AR };
document.documentElement.lang = lang;
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
})();
