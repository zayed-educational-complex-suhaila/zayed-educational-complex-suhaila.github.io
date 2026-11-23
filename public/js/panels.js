// Reusable portal panels shared by teacher.html and admin.html:
//   Panels.examsManager(host, opts)  – filterable exam list with preview / publish / edit / delete
//   Panels.results(host, opts)       – best-score-per-student results with expandable attempts, analytics & export
(function () {
'use strict';
const { $, $$, esc } = UI; const t = (k, v) => I18N.t(k, v);

I18N.add({
  en: {
    err_subject_not_taught: 'This subject is not taught in the selected grade/track.', m_title: 'Title', m_sections: 'Sections', m_q: 'Q', m_students: 'Students attempted', m_attempts: 'Attempts', m_avg: 'Avg best', m_created: 'Uploaded',
    m_publish: 'Publish', m_unpublish: 'Hide', m_reassign: 'Edit / reassign', m_del_q: 'Delete “{x}”? All its student attempts will also be deleted. This cannot be undone.',
    m_none: 'No exams match these filters.', m_teacher_ph: 'Teacher name…', all_sections_word: 'All sections', m_saved: 'Exam updated.', m_deleted: 'Exam deleted.',
    m_pub_ok: 'Exam is now visible to students.', m_hide_ok: 'Exam hidden from students.', m_status_any: 'Any status',
    m_try: 'Try exam', m_try_t: 'Open the exam exactly as students see it. Nothing is saved.', m_mine: 'Only my exams', m_not_mine: 'Uploaded by another teacher',
    err_not_owner: 'Only the teacher who uploaded this exam (or the administrator) can change or delete it.',
    r_mode_best: 'Best score per student', r_mode_all: 'All attempts', r_passfail: 'Pass / Fail', r_search_id: 'Student ID…',
    r_part: 'Participation', r_part_s: '{a} / {b} students attempted', r_avg: 'Average best %', r_pass: 'Pass rate', r_total: 'Total attempts',
    r_best: 'Best score', r_bestp: 'Best %', r_result: 'Result', r_btime: 'Best time', r_last: 'Last attempt', r_attempt: 'Attempt #{n}', r_score: 'Score', r_time: 'Time',
    r_view: 'View answers', r_hardest: 'Hardest questions', r_hardest_s: 'Lowest % correct across all attempts in the current filters (select an exam to see this).',
    r_correct: 'Correct', r_q: 'Question', r_your: 'Student answer', r_key: 'Correct answer', r_none: 'No attempts match these filters yet.', r_showing: 'Showing {a} of {b} rows',
    r_more: 'Show more', r_select_exam: 'Select an exam to see the question breakdown.', r_unanswered: 'Not answered', r_answers_title: 'Answers · {id} · Attempt #{n}',
  },
  ar: {
    err_subject_not_taught: 'هذه المادة لا تُدرَّس في الصف أو المسار المختار.', m_title: 'العنوان', m_sections: 'الشعب', m_q: 'أسئلة', m_students: 'الطلبة المشاركون', m_attempts: 'المحاولات', m_avg: 'متوسط أفضل نتيجة', m_created: 'تاريخ الرفع',
    m_publish: 'نشر', m_unpublish: 'إخفاء', m_reassign: 'تعديل / إعادة تعيين', m_del_q: 'حذف "{x}"؟ سيتم حذف جميع محاولات الطلبة المرتبطة به ولا يمكن التراجع.',
    m_none: 'لا توجد اختبارات مطابقة.', m_teacher_ph: 'اسم المعلم…', all_sections_word: 'جميع الشعب', m_saved: 'تم تحديث الاختبار.', m_deleted: 'تم حذف الاختبار.',
    m_pub_ok: 'أصبح الاختبار ظاهراً للطلبة.', m_hide_ok: 'تم إخفاء الاختبار عن الطلبة.', m_status_any: 'أي حالة',
    m_try: 'جرّب الاختبار', m_try_t: 'افتح الاختبار كما يراه الطلبة تماماً، ولا يتم حفظ أي شيء.', m_mine: 'اختباراتي فقط', m_not_mine: 'رفعه معلم آخر',
    err_not_owner: 'لا يمكن تعديل هذا الاختبار أو حذفه إلا من المعلم الذي رفعه أو من الإدارة.',
    r_mode_best: 'أفضل نتيجة لكل طالب', r_mode_all: 'جميع المحاولات', r_passfail: 'ناجح / لم يجتز', r_search_id: 'رقم الطالب…',
    r_part: 'المشاركة', r_part_s: '{a} / {b} طالباً شاركوا', r_avg: 'متوسط أفضل نسبة', r_pass: 'نسبة النجاح', r_total: 'إجمالي المحاولات',
    r_best: 'أفضل درجة', r_bestp: 'أفضل نسبة', r_result: 'النتيجة', r_btime: 'وقت أفضل محاولة', r_last: 'آخر محاولة', r_attempt: 'المحاولة رقم {n}', r_score: 'الدرجة', r_time: 'الوقت',
    r_view: 'عرض الإجابات', r_hardest: 'الأسئلة الأصعب', r_hardest_s: 'أقل نسبة إجابات صحيحة في جميع المحاولات ضمن التصفية الحالية (اختر اختباراً).',
    r_correct: 'صحيح', r_q: 'السؤال', r_your: 'إجابة الطالب', r_key: 'الإجابة الصحيحة', r_none: 'لا توجد محاولات مطابقة بعد.', r_showing: 'عرض {a} من {b}',
    r_more: 'عرض المزيد', r_select_exam: 'اختر اختباراً لعرض تحليل الأسئلة.', r_unanswered: 'بدون إجابة', r_answers_title: 'الإجابات · {id} · المحاولة {n}',
  },
});

const plain = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\$+([^$]*)\$+/g, '$1').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
function protectDollars(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) if (w.currentNode.data.includes('\\$')) nodes.push(w.currentNode);
  nodes.forEach(n => { const s = n.data, frag = document.createDocumentFragment(); let buf = '', inM = false;
    for (let i = 0; i < s.length; i++) { if (s[i] === '\\' && s[i + 1] === '$') { if (inM) buf += '\\$'; else { frag.append(buf); buf = ''; const sp = document.createElement('span'); sp.textContent = '$'; frag.append(sp); } i++; }
      else { if (s[i] === '$') { inM = !inM; if (s[i + 1] === '$') { buf += '$'; i++; } } buf += s[i]; } }
    frag.append(buf); n.replaceWith(frag); });
}
// Arabic text: move a sign that STARTS a $…$ maths part out of it (same rule as the exam screen)
const AR_SIGN = { '=': '=', '<': '<', '>': '>', '≤': '≤', '≥': '≥', '≠': '≠', '≈': '≈', '\\le': '≤', '\\leq': '≤', '\\ge': '≥', '\\geq': '≥', '\\ne': '≠', '\\neq': '≠', '\\approx': '≈' };
function fixArMath(s) {
  s = String(s ?? '');
  if (!/[؀-ۿ]/.test(s) || s.indexOf('$') < 0) return s;
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && s[i + 1] === '$') { out += '\\$'; i += 2; continue; }        // escaped money sign
    if (s[i] === '$' && s[i + 1] === '$') {                                             // $$display$$: copy unchanged
      const j = s.indexOf('$$', i + 2); if (j < 0) { out += s.slice(i); break; }
      out += s.slice(i, j + 2); i = j + 2; continue;
    }
    if (s[i] === '$') {                                                                 // inline $…$
      let j = i + 1; while (j < s.length && !(s[j] === '$' && s[j - 1] !== '\\')) j++;
      if (j >= s.length) { out += s.slice(i); break; }
      const inner = s.slice(i + 1, j);
      const m = inner.match(/^\s*(\\(?:leq?|geq?|neq?|approx)(?![a-zA-Z])|=|<|>|≤|≥|≠|≈)\s*([\s\S]+)$/);
      out += m ? `${AR_SIGN[m[1]] || m[1]} $${m[2]}$` : s.slice(i, j + 1);
      i = j + 1; continue;
    }
    out += s[i++];
  }
  return out;
}
function fixArabicTextNodes(root) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) if (w.currentNode.data.includes('$')) nodes.push(w.currentNode); nodes.forEach(n => { const v = fixArMath(n.data); if (v !== n.data) n.data = v; }); }
const mathify = el => { fixArabicTextNodes(el); protectDollars(el); if (window.renderMathInElement) renderMathInElement(el,{ delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); };
let SECTIONS = null; const sections = async () => SECTIONS || (SECTIONS = await API.sections());
const sectionsLabel = arr => (!arr || !arr.length || arr.includes('ALL')) ? t('all_sections_word') : arr.join('، ');

// ============================================================ EXAMS MANAGER
// opts.me = the signed-in session: a teacher may change / delete only the exams they uploaded (the server enforces it too);
// "Only my exams" is on by default for teachers. Admins (or no opts.me) manage every exam.
function examsManager(host, opts = {}) {
  const me = opts.me && opts.me.role === 'teacher' ? opts.me : null;
  const st = { term: opts.term || 'ALL', grade: opts.grade || '', track: opts.track || '', subject: opts.subject || '', teacher: '', status: '', mine: !!me };
  const owns = e => !me || e.teacher_name === me.name;
  host.innerHTML = `${me ? `<label class="check" style="margin-bottom:10px;font-weight:800"><input type="checkbox" data-mine ${st.mine ? 'checked' : ''}> <span data-i18n="m_mine"></span></label>` : ''}<div class="filters">
      <label class="field"><span data-i18n="term"></span><select class="input" data-f="term"></select></label>
      <label class="field"><span data-i18n="grade"></span><select class="input" data-f="grade"></select></label>
      <label class="field"><span data-i18n="track"></span><select class="input" data-f="track"></select></label>
      <label class="field"><span data-i18n="subject"></span><select class="input" data-f="subject"></select></label>
      <label class="field"><span data-i18n="status"></span><select class="input" data-f="status"></select></label>
      <label class="field"><span data-i18n="teacher"></span><input class="input" data-f="teacher" data-i18n-ph="m_teacher_ph"></label>
    </div><div class="table-wrap" data-out><div class="empty"><span class="spinner"></span></div></div>`;
  const fillFilters = () => {
    UI.fillSelect($('[data-f=term]', host), UI.termItems(true), st.term);
    UI.fillSelect($('[data-f=grade]', host), UI.gradeItems(), st.grade, 'all_grades');
    UI.fillSelect($('[data-f=track]', host), UI.trackItems(true), st.track, 'all_tracks');
    UI.fillSelect($('[data-f=subject]', host), UI.subjectItems(), st.subject, 'all_subjects');
    UI.fillSelect($('[data-f=status]', host), [{ value: '1', label: t('published') }, { value: '0', label: t('hidden') }], st.status, 'm_status_any');
    I18N.apply(host);
  };
  fillFilters();
  $$('[data-f]', host).forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', UI.debounce(() => { st[el.dataset.f] = el.value; load(); }, el.tagName === 'INPUT' ? 300 : 0)));
  const mineBox = $('[data-mine]', host); if (mineBox) mineBox.onchange = () => { st.mine = mineBox.checked; load(); };
  let rows = [];
  async function load() {
    const out = $('[data-out]', host);
    try {
      rows = await API.exams({ term: st.term, grade: st.grade, track: st.track, subject: st.subject, teacher: st.teacher, published: st.status === '' ? undefined : st.status === '1' });
      if (st.mine && me) rows = rows.filter(e => e.teacher_name === me.name);
      render();
    } catch (e) { UI.handle(e); out.innerHTML = `<div class="empty">${esc(UI.errMsg(e))}</div>`; }
  }
  function render() {
    const out = $('[data-out]', host);
    if (!rows.length) { out.innerHTML = `<div class="empty"><img src="${UI.ORN('checklist')}" alt="">${t('m_none')}</div>`; return; }
    // actions come FIRST (visible without scrolling the wide table), each with a text label
    out.innerHTML = `<table class="data"><thead><tr><th>${t('actions')}</th><th>${t('m_title')}</th><th>${t('subject')}</th><th>${t('grade')} · ${t('track')}</th><th>${t('m_sections')}</th><th>${t('term')}</th><th>${t('teacher')}</th>
      <th class="c">${t('m_q')}</th><th class="c">${t('total_marks')}</th><th class="c">${t('status')}</th><th class="c">${t('m_students')}</th><th class="c">${t('m_attempts')}</th><th class="c">${t('m_avg')}</th><th>${t('m_created')}</th></tr></thead><tbody>
      ${rows.map(e => `<tr data-id="${e.id}">
        <td><div class="row" style="flex-wrap:nowrap;gap:6px">
          <a class="btn btn-primary btn-sm" href="exam.html?id=${encodeURIComponent(e.id)}&preview=1" target="_blank" rel="noopener" title="${esc(t('m_try_t'))}">${UI.ICONS.play}<span>${t('m_try')}</span></a>
          ${owns(e) ? `<button class="btn btn-ghost btn-sm" data-act="pub">${e.is_published ? t('m_unpublish') : t('m_publish')}</button>
          <button class="btn btn-ghost btn-sm" data-act="edit" title="${t('m_reassign')}">${UI.ICONS.edit}<span>${t('edit')}</span></button>
          <button class="btn btn-danger btn-sm" data-act="del">${UI.ICONS.trash}<span>${t('delete')}</span></button>`
          : `<span class="small muted" style="white-space:nowrap">${t('m_not_mine')}</span>`}</div></td>
        <td style="min-width:200px"><b dir="auto">${esc(e.title)}</b></td><td>${esc(t(e.subject))}</td><td style="white-space:nowrap">${esc(UI.gradeTrackLabel(e.grade_num, e.track))}</td>
        <td class="small" dir="auto">${esc(sectionsLabel(e.target_sections))}</td><td><span class="badge b-olive">${esc(t(e.term))}</span></td><td dir="auto">${esc(e.teacher_name)}</td>
        <td class="c num">${e.q_count}</td><td class="c num">${I18N.num(e.total_marks)}</td>
        <td class="c">${e.is_published ? `<span class="badge b-ok">${t('published')}</span>` : `<span class="badge b-gray">${t('hidden')}</span>`}</td>
        <td class="c num">${e.unique_students} / ${e.class_total}</td><td class="c num">${e.attempts_count}</td><td class="c num">${I18N.pct(e.avg_best_pct)}</td>
        <td class="small num">${I18N.date(e.created_at, false)}</td></tr>`).join('')}</tbody></table>`;
    $$('[data-act]', out).forEach(b => b.onclick = () => act(b.dataset.act, rows.find(r => r.id === b.closest('tr').dataset.id)));
  }
  async function act(kind, e) {
    try {
      if (kind === 'pub') { await API.updateExam(e.id, { is_published: e.is_published ? 0 : 1 }); UI.toast(e.is_published ? t('m_hide_ok') : t('m_pub_ok'), 'ok'); load(); opts.onChange && opts.onChange(); }
      if (kind === 'del') { if (await UI.confirmDlg(t('m_del_q', { x: esc(e.title) }), { danger: true, okText: t('delete') })) { await API.deleteExam(e.id); UI.toast(t('m_deleted'), 'ok'); load(); opts.onChange && opts.onChange(); } }
      if (kind === 'edit') editExam(e, () => { load(); opts.onChange && opts.onChange(); });
    } catch (err) { UI.handle(err); }
  }
  I18N.onChange(() => { fillFilters(); render(); });
  load();
  return { reload: load, setTerm: v => { st.term = v; fillFilters(); load(); } };
}

async function editExam(e, done) {
  const secs = await sections();
  const body = document.createElement('div');
  body.innerHTML = `<div class="grid g2">
    <label class="field" style="grid-column:1/-1"><span>${t('m_title')}</span><input class="input" data-k="title" value="${esc(e.title)}" dir="auto"></label>
    <label class="field"><span>${t('subject')}</span><select class="input" data-k="subject"></select></label>
    <label class="field"><span>${t('term')}</span><select class="input" data-k="term"></select></label>
    <label class="field"><span>${t('grade')}</span><select class="input" data-k="grade_num"></select></label>
    <label class="field"><span>${t('track')}</span><select class="input" data-k="track"></select></label>
    <label class="field" style="grid-column:1/-1"><span>${t('teacher')}</span><input class="input" data-k="teacher_name" value="${esc(e.teacher_name)}" dir="auto"></label>
    <div class="field" style="grid-column:1/-1"><span>${t('m_sections')}</span><div data-secs class="row"></div></div></div>`;
  UI.fillSelect($('[data-k=subject]', body), UI.subjectItems(), e.subject);
  UI.fillSelect($('[data-k=term]', body), UI.termItems(), e.term);
  UI.fillSelect($('[data-k=grade_num]', body), UI.gradeItems(), e.grade_num);
  UI.fillSelect($('[data-k=track]', body), UI.trackItems(true), e.track);
  let chosen = new Set(e.target_sections && !e.target_sections.includes('ALL') ? e.target_sections : ['ALL']);
  const drawSecs = () => {
    const g = Number($('[data-k=grade_num]', body).value), tr = $('[data-k=track]', body).value;
    if (window.Catalog) { const sel = $('[data-k=subject]', body), cur = sel.value; const subs = Catalog.subjectsFor(g, tr); UI.fillSelect(sel, subs.map(s => ({ value: s, label: t(s) })), subs.includes(cur) ? cur : subs[0]); }
    const list = secs.filter(s => s.grade_num === g && (tr === 'All' || s.track === tr));
    chosen = new Set([...chosen].filter(x => x === 'ALL' || list.some(s => s.section === x))); if (!chosen.size) chosen.add('ALL');
    $('[data-secs]', body).innerHTML = `<label class="check"><input type="checkbox" value="ALL" ${chosen.has('ALL') ? 'checked' : ''}> ${t('all_sections_word')}</label>` +
      list.map(s => `<label class="check"><input type="checkbox" value="${esc(s.section)}" ${chosen.has(s.section) ? 'checked' : ''}> <bdi>${esc(s.section)}</bdi> <span class="muted small num">(${s.student_count})</span></label>`).join('');
    $$('[data-secs] input', body).forEach(c => c.onchange = () => {
      if (c.value === 'ALL' && c.checked) chosen = new Set(['ALL']); else { chosen.delete('ALL'); c.checked ? chosen.add(c.value) : chosen.delete(c.value); if (!chosen.size) chosen.add('ALL'); }
      drawSecs();
    });
  };
  $('[data-k=grade_num]', body).onchange = drawSecs; $('[data-k=track]', body).onchange = drawSecs; drawSecs();
  const m = UI.modal({ title: t('m_reassign'), body, size: 'wide', footer: `<button class="btn btn-ghost" data-x>${t('cancel')}</button><button class="btn btn-primary" data-save>${t('save')}</button>` });
  $('[data-save]', m.el).onclick = async () => {
    const patch = {}; $$('[data-k]', body).forEach(i => (patch[i.dataset.k] = i.value)); patch.grade_num = Number(patch.grade_num); patch.target_sections = [...chosen];
    if (!patch.title.trim()) return;
    try { await API.updateExam(e.id, patch); UI.toast(t('m_saved'), 'ok'); m.close(); done(); } catch (err) { UI.handle(err); }
  };
}

// ============================================================ RESULTS
function results(host, opts = {}) {
  const st = { term: opts.term || 'ALL', grade: opts.grade || '', track: opts.track || '', section: '', subject: opts.subject || '', exam_id: '', pf: '', sid: '', mode: 'best', limit: 200 };
  host.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div class="pills" style="margin:0"><button class="pill" data-mode="best">${''}</button><button class="pill" data-mode="all"></button></div>
      <button class="btn btn-olive" data-export>${UI.ICONS.download}<span data-i18n="export_xlsx"></span></button></div>
    <div class="filters">
      <label class="field"><span data-i18n="term"></span><select class="input" data-f="term"></select></label>
      <label class="field"><span data-i18n="grade"></span><select class="input" data-f="grade"></select></label>
      <label class="field"><span data-i18n="track"></span><select class="input" data-f="track"></select></label>
      <label class="field"><span data-i18n="section"></span><select class="input" data-f="section"></select></label>
      <label class="field"><span data-i18n="subject"></span><select class="input" data-f="subject"></select></label>
      <label class="field"><span data-i18n="exam"></span><select class="input" data-f="exam_id"></select></label>
      <label class="field"><span data-i18n="r_passfail"></span><select class="input" data-f="pf"></select></label>
      <label class="field"><span data-i18n="student_id"></span><input class="input" data-f="sid" data-i18n-ph="r_search_id" inputmode="text"></label>
    </div>
    <div class="kpis" data-kpis></div>
    <div class="card" data-hard style="margin-bottom:16px"></div>
    <div class="table-wrap" data-out></div><div class="row" style="justify-content:center;margin-top:10px" data-more></div>`;
  let students = [], exams = [], attempts = [], view = [], secs = [];
  const fillFilters = () => {
    UI.fillSelect($('[data-f=term]', host), UI.termItems(true), st.term);
    UI.fillSelect($('[data-f=grade]', host), UI.gradeItems(), st.grade, 'all_grades');
    UI.fillSelect($('[data-f=track]', host), UI.trackItems(), st.track, 'all_tracks');
    UI.fillSelect($('[data-f=section]', host), secs.filter(s => (!st.grade || s.grade_num === Number(st.grade)) && (!st.track || s.track === st.track)).map(s => ({ value: s.section, label: `${s.section} (${s.student_count})` })), st.section, 'all_sections');
    UI.fillSelect($('[data-f=subject]', host), UI.subjectItems(), st.subject, 'all_subjects');
    UI.fillSelect($('[data-f=exam_id]', host), exams.map(e => ({ value: e.id, label: `${e.title} · ${UI.gradeTrackLabel(e.grade_num, e.track)}` })), st.exam_id, 'all_exams');
    UI.fillSelect($('[data-f=pf]', host), [{ value: 'Passed', label: t('passed') }, { value: 'Failed', label: t('failed') }], st.pf, 'all');
    $$('[data-mode]', host).forEach(b => { b.classList.toggle('on', b.dataset.mode === st.mode); b.textContent = t(b.dataset.mode === 'best' ? 'r_mode_best' : 'r_mode_all'); });
    I18N.apply(host);
  };
  $$('[data-mode]', host).forEach(b => b.onclick = () => { st.mode = b.dataset.mode; st.limit = 200; fillFilters(); render(); });
  $$('[data-f]', host).forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', UI.debounce(async () => {
    st[el.dataset.f] = el.value; st.limit = 200;
    if (['grade', 'track'].includes(el.dataset.f)) st.section = '';
    if (['term', 'grade', 'track', 'subject'].includes(el.dataset.f)) { st.exam_id = ''; await loadExams(); }
    fillFilters(); await loadAttempts();
  }, el.tagName === 'INPUT' ? 300 : 0)));
  $('[data-export]', host).onclick = () => exportView().catch(UI.handle);

  async function loadExams() { exams = await API.exams({ term: st.term, grade: st.grade, track: st.track, subject: st.subject }); }
  async function loadAttempts() {
    $('[data-out]', host).innerHTML = `<div class="empty"><span class="spinner"></span></div>`;
    try {
      attempts = await API.attempts({ term: st.term, grade: st.grade, track: st.track, section: st.section, subject: st.subject, exam_id: st.exam_id });
      render(); hardest();
    } catch (e) { UI.handle(e); }
  }
  function scopeStudents() {
    let list = students.filter(s => (!st.grade || s.grade_num === Number(st.grade)) && (!st.track || s.track === st.track) && (!st.section || s.section === st.section));
    const ex = st.exam_id ? exams.find(e => e.id === st.exam_id) : null;
    if (ex) list = list.filter(s => Reports.examVisibleTo(ex, s));
    else if (exams.length && (st.subject || st.term !== 'ALL')) list = list.filter(s => exams.some(e => e.is_published && Reports.examVisibleTo(e, s)));
    return list;
  }
  function compute() {
    const sid = API.normalizeId(st.sid);
    const best = Reports.bestByStudentExam(attempts);
    const groups = [...best.values()].map(v => ({ ...v, b: v.best }));
    if (st.mode === 'best') {
      view = groups.filter(g => (!sid || g.b.student_id.includes(sid)) && (!st.pf || (st.pf === 'Passed') === !!g.b.passed))
        .sort((x, y) => x.b.grade_num - y.b.grade_num || x.b.section.localeCompare(y.b.section, 'ar', { numeric: true }) || x.b.student_id.localeCompare(y.b.student_id) || String(x.b.exam_title).localeCompare(y.b.exam_title));
    } else {
      view = attempts.filter(a => (!sid || a.student_id.includes(sid)) && (!st.pf || (st.pf === 'Passed') === !!a.passed))
        .sort((x, y) => String(y.submitted_at).localeCompare(x.submitted_at));
    }
    const scope = scopeStudents(); const scopeIds = new Set(scope.map(s => s.student_id));
    const participated = new Set(attempts.filter(a => scopeIds.has(a.student_id)).map(a => a.student_id)).size;
    const bests = groups.map(g => g.b.percentage);
    return { groups, participated, scopeN: scope.length, avg: bests.length ? bests.reduce((a, b) => a + b, 0) / bests.length : null, passRate: groups.length ? groups.filter(g => g.b.passed).length / groups.length * 100 : null };
  }
  function render() {
    const k = compute();
    $('[data-kpis]', host).innerHTML = `
      <div class="kpi"><div class="l">${t('r_part')}</div><div class="v">${k.participated} / ${k.scopeN}</div><div class="bar"><i style="width:${k.scopeN ? k.participated / k.scopeN * 100 : 0}%"></i></div></div>
      <div class="kpi olive"><div class="l">${t('r_avg')}</div><div class="v">${I18N.pct(k.avg)}</div></div>
      <div class="kpi gold"><div class="l">${t('r_pass')}</div><div class="v">${I18N.pct(k.passRate)}</div></div>
      <div class="kpi navy"><div class="l">${t('r_total')}</div><div class="v">${attempts.length}</div></div>`;
    const out = $('[data-out]', host), more = $('[data-more]', host);
    if (!view.length) { out.innerHTML = `<div class="empty"><img src="${UI.ORN('analytics')}" alt="">${t('r_none')}</div>`; more.innerHTML = ''; return; }
    const shown = view.slice(0, st.limit);
    if (st.mode === 'best') {
      out.innerHTML = `<table class="data"><thead><tr><th></th><th>${t('student_id')}</th><th>${t('grade')} · ${t('track')}</th><th>${t('section')}</th><th>${t('subject')}</th><th>${t('exam')}</th><th class="c">${t('attempts')}</th><th class="c">${t('r_best')}</th><th class="c">${t('r_bestp')}</th><th class="c">${t('r_result')}</th><th class="c">${t('r_btime')}</th><th>${t('r_last')}</th></tr></thead><tbody>
        ${shown.map((g, i) => `<tr class="clickable" data-i="${i}"><td style="width:28px">${UI.ICONS.chevron.replace('<svg', '<svg style="width:16px;height:16px;fill:var(--muted);transition:transform .15s"')}</td><td class="num"><b>${esc(g.b.student_id)}</b></td><td>${esc(UI.gradeTrackLabel(g.b.grade_num, g.b.track))}</td><td>${esc(g.b.section)}</td><td>${esc(t(g.b.subject))}</td><td dir="auto">${esc(g.b.exam_title)}</td>
          <td class="c num">${g.count}</td><td class="c num">${I18N.num(g.b.score_gained, 1)} / ${I18N.num(g.b.total_marks)}</td><td class="c num"><b>${I18N.pct(g.b.percentage)}</b></td><td class="c">${UI.statusBadge(g.b.passed ? 'Passed' : 'Failed')}</td><td class="c num">${I18N.dur(g.b.time_spent_seconds)}</td><td class="small num">${I18N.date(g.last)}</td></tr>`).join('')}</tbody></table>`;
      $$('tr[data-i]', out).forEach(tr => tr.onclick = () => toggleAttempts(tr, shown[+tr.dataset.i]));
    } else {
      out.innerHTML = `<table class="data"><thead><tr><th>${t('student_id')}</th><th>${t('grade')} · ${t('track')}</th><th>${t('section')}</th><th>${t('subject')}</th><th>${t('exam')}</th><th class="c">#</th><th class="c">${t('r_score')}</th><th class="c">%</th><th class="c">${t('r_result')}</th><th class="c">${t('r_time')}</th><th>${t('date')}</th><th></th></tr></thead><tbody>
        ${shown.map((a, i) => `<tr><td class="num"><b>${esc(a.student_id)}</b></td><td>${esc(UI.gradeTrackLabel(a.grade_num, a.track))}</td><td>${esc(a.section)}</td><td>${esc(t(a.subject))}</td><td dir="auto">${esc(a.exam_title)}</td><td class="c num">${a.attempt_number}</td>
          <td class="c num">${I18N.num(a.score_gained, 1)} / ${I18N.num(a.total_marks)}</td><td class="c num">${I18N.pct(a.percentage)}</td><td class="c">${UI.statusBadge(a.passed ? 'Passed' : 'Failed')}</td><td class="c num">${I18N.dur(a.time_spent_seconds)}</td><td class="small num">${I18N.date(a.submitted_at)}</td>
          <td><button class="btn btn-ghost btn-sm" data-view="${a.id}">${t('r_view')}</button></td></tr>`).join('')}</tbody></table>`;
      $$('[data-view]', out).forEach(b => b.onclick = () => viewAnswers(b.dataset.view));
    }
    more.innerHTML = `<span class="small muted num">${t('r_showing', { a: shown.length, b: view.length })}</span>` + (view.length > st.limit ? ` <button class="btn btn-ghost btn-sm">${t('r_more')}</button>` : '');
    const mb = $('button', more); if (mb) mb.onclick = () => { st.limit += 300; render(); };
  }
  function toggleAttempts(tr, g) {
    const open = tr.nextElementSibling && tr.nextElementSibling.classList.contains('sub');
    tr.querySelector('svg').style.transform = open ? '' : 'rotate(90deg)';
    if (open) { let n = tr.nextElementSibling; while (n && n.classList.contains('sub')) { const x = n.nextElementSibling; n.remove(); n = x; } return; }
    const frag = g.all.map(a => `<tr class="sub"><td></td><td colspan="5"><b>${t('r_attempt', { n: a.attempt_number })}</b> ${a.id === g.b.id ? `<span class="badge b-olive">★ ${t('r_best')}</span>` : ''}</td><td></td>
      <td class="c num">${I18N.num(a.score_gained, 1)} / ${I18N.num(a.total_marks)}</td><td class="c num">${I18N.pct(a.percentage)}</td><td class="c">${UI.statusBadge(a.passed ? 'Passed' : 'Failed')}</td><td class="c num">${I18N.dur(a.time_spent_seconds)}</td>
      <td class="small num"><div class="row" style="flex-wrap:nowrap">${I18N.date(a.submitted_at)} <button class="btn btn-ghost btn-sm" data-view="${a.id}">${t('r_view')}</button></div></td></tr>`).join('');
    tr.insertAdjacentHTML('afterend', frag);
    let n = tr.nextElementSibling; while (n && n.classList.contains('sub')) { const b = $('[data-view]', n); if (b) b.onclick = ev => { ev.stopPropagation(); viewAnswers(b.dataset.view); }; n = n.nextElementSibling; }
  }
  async function hardest() {
    const box = $('[data-hard]', host);
    box.innerHTML = `<div class="card-h"><img class="ill" src="${UI.ORN('reports')}" alt=""><div><h2>${t('r_hardest')}</h2><div class="sub">${t('r_hardest_s')}</div></div></div>`;
    if (!st.exam_id) { box.insertAdjacentHTML('beforeend', `<div class="card-b muted small">${t('r_select_exam')}</div>`); return; }
    try {
      const stats = (await API.examItemStats(st.exam_id, { track: st.track, section: st.section })).filter(s => s.attempts > 0).sort((a, b) => a.correct_rate - b.correct_rate).slice(0, 8);
      if (!stats.length) { box.insertAdjacentHTML('beforeend', `<div class="card-b muted small">${t('r_none')}</div>`); return; }
      box.insertAdjacentHTML('beforeend', `<div class="card-b"><table class="data"><thead><tr><th class="c">#</th><th>${t('r_q')}</th><th class="c">${t('r_correct')}</th><th style="width:34%"></th></tr></thead><tbody>${stats.map(s => `<tr>
        <td class="c num">Q${s.index + 1}</td><td><div dir="auto">${esc(plain(s.text).slice(0, 140))}</div><div class="small muted" dir="auto">${esc([s.section_part, s.topic].filter(Boolean).join(' · '))}</div></td>
        <td class="c num"><b>${I18N.pct(s.correct_rate)}</b> <span class="small muted">(${s.correct}/${s.attempts})</span></td>
        <td><div class="kpi" style="padding:0;border:0"><div class="bar" style="margin:0;height:9px"><i style="width:${s.correct_rate}%;background:${s.correct_rate < 40 ? 'var(--bad)' : s.correct_rate < 70 ? '#E08A4F' : 'var(--lime)'}"></i></div></div></td></tr>`).join('')}</tbody></table></div>`);
    } catch (e) { UI.handle(e); }
  }
  // one answer for the answers table: letter + optional picture thumbnail + text
  const optCell = (q, k) => { const im = (q.option_images || [])[k];
    return `${String.fromCharCode(65 + k)}. ${im ? `<img src="${esc(im)}" alt="" style="display:block;max-width:120px;max-height:90px;border:1px solid var(--line);border-radius:4px;margin:2px 0">` : ''}${q.options[k] || ''}${(q.options_ar || [])[k] ? `<div dir="rtl">${q.options_ar[k]}</div>` : ''}`; };
  async function viewAnswers(id) {
    try {
      const a = await API.attempt(id); const e = await API.exam(a.exam_id);
      const rows = e.questions.map((q, i) => { const ans = a.answers[i] || {}; const p = ans.picked; const ok = p === q.correct;
        return `<tr><td class="c num">${i + 1}</td><td class="small" dir="auto">${esc(q.section_part || '')}</td><td><div dir="auto" class="mq">${q.en || ''}${q.ar ? `<div dir="rtl">${q.ar}</div>` : ''}</div></td>
          <td dir="auto" class="mq">${p === null || p === undefined ? `<span class="badge b-gray">${t('r_unanswered')}</span>` : `${optCell(q, p)}`}</td>
          <td dir="auto" class="mq">${optCell(q, q.correct)}</td><td class="c">${ok ? '<span class="badge b-ok">✓</span>' : '<span class="badge b-bad">✗</span>'}</td><td class="c num">${ok ? q.marks : 0}/${q.marks}</td></tr>`; }).join('');
      const m = UI.modal({ title: t('r_answers_title', { id: esc(a.student_id), n: a.attempt_number }), size: 'xl',
        body: `<div class="row" style="margin-bottom:12px"><span class="badge b-blue" dir="auto">${esc(e.title)}</span><span class="badge b-olive">${esc(t(e.term))}</span><span class="badge ${a.passed ? 'b-ok' : 'b-bad'} num">${I18N.num(a.score_gained, 1)} / ${I18N.num(a.total_marks)} · ${I18N.pct(a.percentage)}</span><span class="badge b-gray num">${I18N.dur(a.time_spent_seconds)}</span><span class="badge b-gray num">${I18N.date(a.submitted_at)}</span></div>
          <div class="table-wrap"><table class="data"><thead><tr><th class="c">#</th><th>Part</th><th>${t('r_q')}</th><th>${t('r_your')}</th><th>${t('r_key')}</th><th class="c"></th><th class="c">${t('marks')}</th></tr></thead><tbody>${rows}</tbody></table></div>` });
      mathify(m.body);
    } catch (e) { UI.handle(e); }
  }
  async function exportView() {
    compute();
    const term = st.term === 'ALL' ? 'All_Terms' : st.term.replace(' ', '_');
    if (st.mode === 'best') {
      const rows = view.map(g => ({ Student_ID: g.b.student_id, Grade: g.b.grade_num, Track: g.b.track, Section: g.b.section, Term: g.b.term, Subject: g.b.subject, Exam: g.b.exam_title, Attempts: g.count, Best_Score: g.b.score_gained, Total_Marks: g.b.total_marks, 'Best_%': Math.round(g.b.percentage * 10) / 10, Result: g.b.passed ? 'Passed' : 'Failed', Best_Time: I18N.dur(g.b.time_spent_seconds), Last_Attempt_Date: Reports.fmtDate(g.last) }));
      await UI.exportRows('Best_Scores', rows, Object.keys(rows[0] || { Student_ID: '' }), `Results_Best_Score_${term}.xlsx`, 'Result');
    } else {
      const rows = view.map(a => ({ Student_ID: a.student_id, Grade: a.grade_num, Track: a.track, Section: a.section, Term: a.term, Subject: a.subject, Exam: a.exam_title, Attempt_No: a.attempt_number, Score: a.score_gained, Total_Marks: a.total_marks, 'Percent_%': Math.round(a.percentage * 10) / 10, Result: a.passed ? 'Passed' : 'Failed', Time: I18N.dur(a.time_spent_seconds), Submitted_At: Reports.fmtDate(a.submitted_at) }));
      await UI.exportRows('All_Attempts', rows, Object.keys(rows[0] || { Student_ID: '' }), `Results_All_Attempts_${term}.xlsx`, 'Result');
    }
  }
  (async () => {
    try { [students, secs] = await Promise.all([API.students({}), sections()]); await loadExams(); fillFilters(); await loadAttempts(); } catch (e) { UI.handle(e); }
  })();
  I18N.onChange(() => { fillFilters(); render(); hardest(); });
  return { reload: async () => { await loadExams(); fillFilters(); await loadAttempts(); }, setTerm: async v => { st.term = v; st.exam_id = ''; await loadExams(); fillFilters(); await loadAttempts(); } };
}

window.Panels = { examsManager, results, sections, sectionsLabel, plain, mathify };
})();
