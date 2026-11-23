// Sign-in pages: index.html (Students & visitors) and staff.html (Teachers & administration) share this script.
// Each page contains only its own role tiles and forms; everything below works with whatever is present.
I18N.add({
  en: { signin: 'Sign in', choose_role: 'Choose how you are signing in.',
    signin_students: 'Students & visitors', choose_students: 'School students sign in with their Student ID. Visitors from outside the school use a guest code.',
    signin_staff: 'Teachers & administration', choose_staff: 'Staff sign-in. Students and visitors use the main page.', gate_lead: 'Practise end-of-term exams for Grades 5–12 in the same SwiftAssess environment used on exam day — in English and Arabic.',
    f_grades: 'Grades', f_sections: 'Sections', f_students: 'Students',
    r_student_s: 'Student ID', r_teacher_s: 'Teacher PIN', r_admin_s: 'Admin PIN', r_guest_s: 'Visitors',
    our_students: 'Suhaila Complex students', our_students_s: 'Sign in with your Student ID.',
    other_students: 'Students from other schools', other_students_s: 'Practise our exams with your name and your class code.', other_students_link: 'From another school? Practise here',
    guest_name: 'Your name', ph_guest_name: 'e.g. Ahmed Ali',
    guest_code: 'Class code', ph_guest: 'e.g. 9a', guest_hint: 'Class code = your grade and track: 5g … 8g, then 9g / 9a … 12g / 12a (g = General, a = Advanced). Your results are saved under your name — type the same name and code next time to see them. Only you see them.',
    need_code: 'Type your class code, e.g. 9a.', need_guest_name: 'Type your name.', err_guest_name_required: 'Please type your name (2–40 letters).', err_bad_guest_code: 'That code is not valid. Use your grade and track, e.g. 7g, 10a.', err_guest_disabled: 'Guest practice is switched off at the moment.',
    ph_student: 'e.g. 2012345678', stu_hint: 'Type your Student ID exactly as on your school record. Arabic or English digits both work.',
    teacher_pin: '4-digit Teacher PIN', teacher_name: 'Teacher name', ph_tname: 'Your full name', admin_pin: '4-digit Admin PIN', enter: 'Sign in',
    err_bad_pin: 'Incorrect PIN. Please try again.', err_unknown_student: 'This Student ID was not found. Check the number and try again.', err_locked: 'Too many attempts. Please wait {s} seconds.',
    err_name_required: 'Please choose your name from the list.', err_unknown_teacher: 'This name is not on the school teacher list.', need_pin: 'Enter the 4-digit PIN.', need_id: 'Enter your Student ID.' },
  ar: { signin: 'تسجيل الدخول', choose_role: 'اختر طريقة الدخول.',
    signin_students: 'الطلبة والزوار', choose_students: 'يدخل طلبة المدرسة برقم الطالب، ويستخدم الزوار من خارج المدرسة رمز الزائر.',
    signin_staff: 'المعلمون والإدارة', choose_staff: 'دخول الموظفين. يستخدم الطلبة والزوار الصفحة الرئيسية.', gate_lead: 'تدرّب على اختبارات نهاية الفصل للصفوف 5–12 في بيئة SwiftAssess نفسها المستخدمة يوم الاختبار — بالعربية والإنجليزية.',
    f_grades: 'الصفوف', f_sections: 'شعبة', f_students: 'طالب',
    r_student_s: 'رقم الطالب', r_teacher_s: 'رمز المعلم', r_admin_s: 'رمز الإدارة', r_guest_s: 'للزوار',
    our_students: 'طلاب مجمع سهيلة', our_students_s: 'ادخل برقم الطالب.',
    other_students: 'طلاب مدارس أخرى', other_students_s: 'تدرّب على اختباراتنا باسمك ورمز صفك.', other_students_link: 'طالب من مدرسة أخرى؟ تدرّب من هنا',
    guest_name: 'اسمك', ph_guest_name: 'مثال: أحمد علي',
    guest_code: 'رمز الصف', ph_guest: 'مثال: 9a', guest_hint: 'رمز الصف = صفك ومسارك: من 5g إلى 8g، ثم 9g / 9a إلى 12g / 12a (g = عام، a = متقدم). تُحفظ نتائجك باسمك — اكتب الاسم والرمز نفسيهما في المرة القادمة لتراها. لا يراها أحد غيرك.',
    need_code: 'اكتب رمز الصف، مثال: 9a.', need_guest_name: 'اكتب اسمك.', err_guest_name_required: 'الرجاء كتابة اسمك (من 2 إلى 40 حرفاً).', err_bad_guest_code: 'الرمز غير صحيح. اكتب الصف والمسار، مثال: 7g أو 10a.', err_guest_disabled: 'التدريب للزوار متوقف حالياً.',
    ph_student: 'مثال: 2012345678', stu_hint: 'اكتب رقم الطالب كما هو في السجل المدرسي، ويمكن استخدام الأرقام العربية أو الإنجليزية.',
    teacher_pin: 'رمز المعلم (4 أرقام)', teacher_name: 'اسم المعلم', ph_tname: 'الاسم الكامل', admin_pin: 'رمز الإدارة (4 أرقام)', enter: 'دخول',
    err_bad_pin: 'الرمز غير صحيح، حاول مرة أخرى.', err_unknown_student: 'رقم الطالب غير موجود، تحقق من الرقم وحاول مجدداً.', err_locked: 'محاولات كثيرة، الرجاء الانتظار {s} ثانية.',
    err_name_required: 'الرجاء اختيار اسمك من القائمة.', err_unknown_teacher: 'هذا الاسم غير موجود في قائمة معلمي المدرسة.', need_pin: 'أدخل الرمز المكوّن من 4 أرقام.', need_id: 'أدخل رقم الطالب.' },
});
const { $, $$, t } = { ...UI, t: I18N.t };
let msgBox = null;   // the message area of the form being submitted (each box shows its own errors)
const msg = (text, kind = 'err') => { (msgBox || $('#msg')).innerHTML = text ? `<div class="notice ${kind}">${UI.esc(text)}</div>` : ''; };
const formOf = sel => $(sel) || {};   // a form that is not on this page gets a harmless placeholder

function pickRole(r) {
  $$('.role').forEach(b => b.classList.toggle('on', b.dataset.role === r));
  $$('.form-panel').forEach(f => f.classList.toggle('on', f.id === 'f-' + r));
  msg('');
  const first = $('#f-' + r + ' input'); if (first) setTimeout(() => first.focus(), 30);
  try { sessionStorage.setItem('gate.role', r); } catch (_) {}
}
$$('.role').forEach(b => b.onclick = () => pickRole(b.dataset.role));
$$('.lang-switch button').forEach(b => b.onclick = () => I18N.setLang(b.dataset.lang));

let picker;
function fillTeacherSelects() {
  if (!$('#tDept')) return;   // staff page only
  if (picker) { picker.refresh(); return; }
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('zec.teacherPrefs') || '{}'); } catch (_) {}
  picker = UI.classPicker({ dept: '#tDept', name: '#tName', grade: '#tGrade', track: '#tTrack', subject: '#tSubject', prefer: saved });
}
I18N.onChange(fillTeacherSelects);

async function run(form, fn) {
  msgBox = form.querySelector('.msg'); $$('.msg').forEach(m => { m.innerHTML = ''; });
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
  try { await fn(); } catch (e) { msg(e.code === 'locked' ? t('err_locked', { s: e.message }) : UI.errMsg(e)); } finally { btn.disabled = false; }
}
formOf('#f-student').onsubmit = e => { e.preventDefault(); run(e.target, async () => {
  const id = API.normalizeId($('#stuId').value); if (!id) { msg(t('need_id')); return; }
  await API.login('student', { student_id: id }); location.href = 'student.html'; }); };
formOf('#f-teacher').onsubmit = e => { e.preventDefault(); run(e.target, async () => {
  const pin = API.normalizeId($('#tPin').value); if (!/^\d{4}$/.test(pin)) { msg(t('need_pin')); return; }
  const c = picker.get();
  if (!c.teacher) { msg(t('err_name_required')); return; }
  const p = { pin, teacher_name: c.teacher, grade: c.grade, track: c.track, subject: c.subject };
  await API.login('teacher', p);
  localStorage.setItem('zec.teacherPrefs', JSON.stringify({ name: p.teacher_name, grade: p.grade, track: p.track, subject: p.subject }));
  location.href = 'teacher.html'; }); };
formOf('#f-guest').onsubmit = e => { e.preventDefault(); run(e.target, async () => {
  const name = $('#gName').value.trim().replace(/\s+/g, ' '), code = $('#gCode').value.trim();
  if (name.length < 2) { msg(t('need_guest_name')); return; } if (!code) { msg(t('need_code')); return; }
  await API.login('guest', { code, name }); try { localStorage.setItem('zec.guestPrefs', JSON.stringify({ name, code })); } catch (_) {}
  location.href = 'student.html'; }); };
formOf('#f-admin').onsubmit = e => { e.preventDefault(); run(e.target, async () => {
  const pin = API.normalizeId($('#aPin').value); if (!/^\d{4}$/.test(pin)) { msg(t('need_pin')); return; }
  await API.login('admin', { pin }); location.href = 'admin.html'; }); };
// PIN boxes: digits only (Arabic-Indic digits are converted)
['#tPin', '#aPin'].filter(s => $(s)).forEach(s => $(s).addEventListener('input', e => { e.target.value = I18N.toWestern(e.target.value).replace(/\D/g, '').slice(0, 4); }));

(async () => {
  if (API.mode === 'demo') { $('#demoRibbon').innerHTML = `<div class="demo-ribbon" data-i18n="demo_ribbon"></div>`; }
  fillTeacherSelects(); I18N.apply();
  try { const s = await API.me(); if (s) { location.replace(s.role === 'student' || s.role === 'guest' ? 'student.html' : s.role + '.html'); return; } } catch (_) {}
  const tiles = $$('.role').map(b => b.dataset.role); let r = tiles[0]; try { const saved = sessionStorage.getItem('gate.role'); if (tiles.includes(saved)) r = saved; } catch (_) {}
  if (r) pickRole(r);   // the students page has no tiles (both boxes are always shown)
  try { const g = JSON.parse(localStorage.getItem('zec.guestPrefs') || '{}'); if ($('#gName') && g.name) { $('#gName').value = g.name; $('#gCode').value = g.code || ''; } } catch (_) {}
})();
