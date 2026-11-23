// Shared portal UI: header, toasts, modals, helpers.
(function () {
'use strict';
const t = (k, v) => I18N.t(k, v);
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Arabic', 'Islamic Education', 'Social Studies', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Other'];
const GRADES = [5, 6, 7, 8, 9, 10, 11, 12];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ICONS = {
  logout: '<svg viewBox="0 0 24 24" class="flip"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4a2 2 0 00-2 2v14a2 2 0 002 2h8v-2H4z"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zM20.7 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5zm7-18v12.17l-4.59-4.58L6 11l6 6 6-6-1.41-1.41L13 14.17V2z"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5zM12 2l-6 6 1.41 1.41L11 5.83V16h2V5.83l3.59 3.58L18 8z"/></svg>',
  play: '<svg viewBox="0 0 24 24" class="flip"><path d="M8 5v14l11-7z"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 00-2 2v14h2V3h12zm3 4H8a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h11z"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4zM19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>',
  calc: '<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM6 7h12V5H6zm1.5 4h2v2h-2zm0 4h2v2h-2zm4.5-4h2v2h-2zm0 4h2v2h-2zm4.5-4h2v6h-2z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
  image: '<svg viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" class="flip"><path d="M10 6L8.6 7.4 13.2 12l-4.6 4.6L10 18l6-6z"/></svg>',
};
const ORN = n => `assets/ornaments/${n}.svg`;

// ---------- toasts ----------
function toast(msg, type = 'info', ms = 3800) {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const d = document.createElement('div'); d.className = 'toast ' + (type === 'ok' ? 'ok' : type === 'err' ? 'err' : type === 'warn' ? 'warn' : '');
  d.setAttribute('role', 'status'); d.textContent = msg; box.appendChild(d); setTimeout(() => d.remove(), ms);
}
// ---------- modal ----------
function modal({ title, body, footer, size }) {
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${size || ''}" role="dialog" aria-modal="true"><div class="modal-h"><h3>${title || ''}</h3><button class="icon-btn" data-x aria-label="${t('close')}"><svg viewBox="0 0 24 24"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg></button></div><div class="modal-b"></div>${footer !== false ? '<div class="modal-f"></div>' : ''}</div>`;
  const b = $('.modal-b', back); if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
  if (footer && footer !== false) { const f = $('.modal-f', back); if (typeof footer === 'string') f.innerHTML = footer; else f.appendChild(footer); }
  else if (footer === undefined) $('.modal-f', back).innerHTML = `<button class="btn btn-ghost" data-x>${t('close')}</button>`;
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-x]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  return { el: back, body: b, close };
}
function confirmDlg(message, { okText, danger } = {}) {
  return new Promise(res => {
    const m = modal({ title: t('confirm'), body: `<p style="margin:0">${message}</p>`, footer: `<button class="btn btn-ghost" data-no>${t('cancel')}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${okText || t('confirm')}</button>` });
    $('[data-yes]', m.el).onclick = () => { m.close(); res(true); };
    $('[data-no]', m.el).onclick = () => { m.close(); res(false); };
    m.el.addEventListener('click', e => { if (e.target === m.el || e.target.closest('[data-x]')) res(false); });
  });
}

// ---------- error handling ----------
function errMsg(e) {
  if (!e) return t('error');
  if (e.code === 'unauthorized') return t('err_unauthorized');
  if (e instanceof TypeError) return t('err_network');
  return I18N.t('err_' + e.code) !== 'err_' + e.code ? I18N.t('err_' + e.code, { s: e.message }) : (e.message || t('error'));
}
function handle(e) { console.error(e); toast(errMsg(e), 'err', 5200); if (e && e.code === 'unauthorized') setTimeout(() => location.replace('index.html'), 1200); }

// ---------- auth guard ----------
async function requireRole(...roles) {
  const s = await API.me();
  if (!s || !roles.includes(s.role)) { location.replace('index.html'); throw new Error('redirect'); }
  return s;
}

// ---------- header ----------
async function header({ session, title, subtitle, ornament }) {
  const host = $('#appHeader'); if (!host) return;
  let term = 'Term 1'; try { term = (await API.getTerm()).active_term; } catch (_) { /* */ }
  const roleKey = session ? 'role_' + session.role : '';
  const who = session ? (session.role === 'student' ? session.student_id : session.role === 'guest' ? `${I18N.gradeLabel(session.grade_num)} · ${t(session.track)}` : session.name) : '';
  host.innerHTML = `${API.mode === 'demo' ? `<div class="demo-ribbon" data-i18n="demo_ribbon"></div>` : ''}
  <header class="app-header"><div class="bar">
    <a class="brand" href="${session ? (session.role === 'student' || session.role === 'guest' ? 'student.html' : session.role + '.html') : 'index.html'}"><img class="strip" src="assets/school-logo.png" alt="${esc(t('school'))}"><img class="mark" src="assets/complex-logo.png" alt=""></a>
    <span class="spacer"></span>
    <div class="tools">
      <span class="term-badge" id="hdrTerm" title="${esc(t('active_term'))}">${esc(t(term))}</span>
      <div class="lang-switch" role="group" aria-label="Language"><button data-lang="ar">عربي</button><button data-lang="en">English</button></div>
      ${session ? `<span class="user-chip"><span class="nm num">${esc(who)}</span><span class="role" data-i18n="${roleKey}"></span></span><button class="icon-btn" id="hdrLogout" data-i18n-title="logout">${ICONS.logout}</button>` : ''}
    </div></div></header>
  <section class="hero-band"><div class="in">
    <img class="deco" src="${ORN(ornament || 'learning')}" alt="">
    <div><h1 id="heroTitle">${title || ''}</h1><p id="heroSub">${subtitle || ''}</p></div>
    <img class="motto" src="assets/motto-banner.jpg" alt="${esc(t('motto'))}">
  </div></section>`;
  $$('.lang-switch button', host).forEach(b => b.onclick = () => I18N.setLang(b.dataset.lang));
  const lo = $('#hdrLogout'); if (lo) lo.onclick = async () => { await API.logout(); location.href = 'index.html'; };
  I18N.onChange(() => { const ht = $('#hdrTerm'); if (ht) ht.textContent = t(term); });
  I18N.apply(host);
  return term;
}
function setHero(title, subtitle) { const h = $('#heroTitle'), s = $('#heroSub'); if (h) h.textContent = title; if (s) s.textContent = subtitle || ''; }
function footer() {
  const f = $('#appFooter'); if (!f) return;
  f.innerHTML = `<div class="footer"><img src="assets/complex-logo.png" alt=""><div data-i18n="school"></div><div class="num" data-i18n="year"></div></div>`;
  I18N.apply(f);
}

// ---------- select builders ----------
const opt = (v, label, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(label)}</option>`;
function fillSelect(sel, items, current, allLabelKey) {
  if (typeof sel === 'string') sel = $(sel);
  if (!sel) return;
  const cur = current !== undefined ? current : sel.value;
  sel.innerHTML = (allLabelKey ? opt('', t(allLabelKey), cur) : '') + items.map(i => (typeof i === 'object' ? opt(i.value, i.label, cur) : opt(i, i, cur))).join('');
}
const gradeItems = () => GRADES.map(g => ({ value: g, label: I18N.gradeLabel(g) }));
const trackItems = (withAll) => ['General', 'Advanced'].concat(withAll ? ['All'] : []).map(x => ({ value: x, label: t(x) }));
const subjectItems = () => SUBJECTS.map(s => ({ value: s, label: t(s) }));
const termItems = (withAll) => TERMS.map(x => ({ value: x, label: t(x) })).concat(withAll ? [{ value: 'ALL', label: t('all_terms') }] : []);
const gradeTrackLabel = (g, tr) => `${I18N.gradeLabel(g)} · ${t(tr)}`;

// ---------- tabs ----------
function tabs(container, onChange) {
  const btns = $$('.tabs button', container);
  const show = id => { btns.forEach(b => b.classList.toggle('on', b.dataset.tab === id)); $$('.tab-panel', container).forEach(p => p.classList.toggle('on', p.id === id)); try { sessionStorage.setItem('tab.' + location.pathname, id); } catch (_) { /* */ } onChange && onChange(id); };
  btns.forEach(b => b.onclick = () => show(b.dataset.tab));
  let first = btns[0] && btns[0].dataset.tab; try { const s = sessionStorage.getItem('tab.' + location.pathname); if (s && btns.some(b => b.dataset.tab === s)) first = s; } catch (_) { /* */ }
  show(first);
  return show;
}

// ---------- Excel table export (browser) ----------
async function exportRows(sheet, rows, columns, filename, statusCol) {
  const b = Reports.buildTableWorkbook(sheet, rows, columns, filename, statusCol);
  await API.saveWorkbook(b.wb, b.filename);
}
const statusBadge = s => s === 'Passed' ? `<span class="badge b-ok">${t('passed')}</span>` : s === 'Failed' ? `<span class="badge b-bad">${t('failed')}</span>` : `<span class="badge b-gray">${t('not_attempted')}</span>`;
const debounce = (fn, ms = 250) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };

// ---------- teacher-aware class picker (needs Catalog) ----------
// Order: Subject (department) -> Teacher (only that department's teachers) -> Grade -> Track -> Science branch.
// Physics / Chemistry / Biology count as Science: the branch field appears only for the Science department and
// lists the branches the class sits (Science / Physics / Chemistry / Biology). All teachers can target all grades/tracks.
// Without a chosen teacher, grade/track/branch follow what the class actually sits (catalog).
function classPicker({ dept, name, grade, track, subject, prefer = {}, onChange }) {
  const C = window.Catalog; const el = s => (typeof s === 'string' ? $(s) : s);
  dept = el(dept); name = el(name); grade = el(grade); track = el(track); subject = el(subject);
  const tracksOfGrade = g => C.GRADE_TRACKS.filter(x => x.grade_num === Number(g)).map(x => x.track);
  const pick = (list, ...cands) => { for (const c of cands) if (c !== undefined && c !== null && c !== '' && list.map(String).includes(String(c))) return c; return list[0]; };
  function refresh(keep = {}) {
    // 1) subject / department
    const d = pick(C.DEPARTMENTS, keep.dept ?? dept.value, prefer.subject && C.departmentOf(prefer.subject));
    fillSelect(dept, C.DEPARTMENTS.map(x => ({ value: x, label: t(x) })), d);
    // 2) teacher — only this department's teachers (names come from the school list only)
    const names = C.teachersOfDepartment(dept.value);
    const nm = keep.name !== undefined ? keep.name : name.value;
    name.innerHTML = `<option value="">${esc(t('choose_teacher'))}</option>` + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    name.value = names.includes(nm) ? nm : (names.includes(prefer.name) && keep.name === undefined ? prefer.name : '');
    // Every teacher may target ANY grade/track (lists come from the catalog of what each class sits).
    // The teacher's own classes are only the default selection and are marked with ★.
    const who = name.value, branches = C.branchesOf(dept.value);
    const asg = who ? C.assignmentsOf(who).filter(a => branches.includes(a.subject)) : [];
    const first = asg[0] || {}, star = ok => (ok ? ' ★' : '');
    const init = keep.init ? prefer : {};
    // 3) grade
    const gs = [5, 6, 7, 8, 9, 10, 11, 12].filter(g => C.subjectsFor(g, 'All').some(s => branches.includes(s)));
    fillSelect(grade, gs.map(g => ({ value: g, label: I18N.gradeLabel(g) + star(asg.some(a => a.grade_num === g)) })), pick(gs, keep.grade ?? grade.value, init.grade, first.grade_num));
    // 4) track
    const g = Number(grade.value);
    const ts = ['General', 'Advanced'].filter(tr => tracksOfGrade(g).includes(tr) && C.subjectsFor(g, tr).some(s => branches.includes(s)));
    const items = ts.concat(ts.length > 1 ? ['All'] : []);
    const ownTrack = (asg.find(a => a.grade_num === g) || {}).track;
    fillSelect(track, items.map(x => ({ value: x, label: t(x) + star(asg.some(a => a.grade_num === g && a.track === x)) })), pick(items, keep.track ?? track.value, init.track, ownTrack));
    // 5) branch (specific subject): Science department only
    const tr = track.value;
    let subs = C.subjectsFor(g, tr).filter(s => branches.includes(s));
    if (tr === 'All') subs = subs.filter(s => ['General', 'Advanced'].some(x => C.isTaught(s, g, x)));
    subs = C.sortSubjects(subs);
    const ownSub = (asg.find(a => a.grade_num === g && (tr === 'All' || a.track === tr)) || {}).subject;
    fillSelect(subject, subs.map(s => ({ value: s, label: t(s) + star(asg.some(a => a.subject === s && a.grade_num === g)) })), pick(subs, keep.subject ?? subject.value, init.subject, ownSub));
    const bf = subject.closest('.field'); if (bf) bf.hidden = dept.value !== 'Science';
    onChange && onChange(get());
  }
  const get = () => ({ teacher: name.value, known: !!name.value, dept: dept.value, grade: Number(grade.value), track: track.value, subject: subject.value });
  dept.addEventListener('change', () => refresh({ dept: dept.value, name: '', grade: '', track: '', subject: '' }));
  name.addEventListener('change', () => refresh({ name: name.value, grade: '', track: '', subject: '' }));
  grade.addEventListener('change', () => refresh({ grade: grade.value, track: '' }));
  track.addEventListener('change', () => refresh({ track: track.value }));
  subject.addEventListener('change', () => onChange && onChange(get()));
  refresh({ name: prefer.name || '', init: true });
  return { get, refresh: () => refresh({ name: name.value, grade: grade.value, track: track.value, subject: subject.value }) };
}
I18N.add({ en: { choose_teacher: '— Choose your name —', science_branch: 'Science branch' },
  ar: { choose_teacher: '— اختر اسمك —', science_branch: 'فرع العلوم' } });

window.UI = { $, $$, esc, toast, modal, confirmDlg, handle, errMsg, requireRole, header, setHero, footer, fillSelect, gradeItems, trackItems, subjectItems, termItems, gradeTrackLabel,
  tabs, exportRows, statusBadge, debounce, classPicker, ICONS, ORN, SUBJECTS, GRADES, TERMS };
})();
