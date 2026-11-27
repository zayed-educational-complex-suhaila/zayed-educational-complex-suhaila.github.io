// ============================================================================
//  API layer — every page talks ONLY to window.API.
//  • server mode: thin fetch() wrapper over the REST contract (docs/API_CONTRACT.md)
//  • demo mode:   a complete in-browser implementation (IndexedDB) with the same
//                 method signatures and return shapes, so the UI is fully usable
//                 before the backend exists.
// ============================================================================
(function () {
'use strict';
const CFG = window.APP_CONFIG || { mode: 'demo', apiBase: '/api' };
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const nowIso = () => new Date().toISOString();
const normalizeId = v => String(v ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\s+/g, '').toUpperCase().replace(/^(\d+)\.0+$/, '$1');
const totalMarks = qs => qs.reduce((s, q) => s + (Number(q.marks) || 0), 0);
// Guest practice code -> class: 5g … 8g (General), 9g/9a … 12g/12a. Arabic digits and ع (عام) / م (متقدم) accepted.
// Mirrors _guest_class() in database/supabase.sql.
const parseGuestCode = v => {
  const s = String(v ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/ع/g, 'g').replace(/م/g, 'a').replace(/\s+/g, '').toLowerCase();
  let m = s.match(/^([5-8])g$/); if (m) return { grade_num: +m[1], track: 'General' };
  m = s.match(/^(9|10|11|12)([ga])$/); if (m) return { grade_num: +m[1], track: m[2] === 'a' ? 'Advanced' : 'General' };
  return null;
};
class ApiError extends Error { constructor(code, message, status) { super(message || code); this.code = code; this.status = status; } }

// ---------------------------------------------------------------- SERVER MODE
function serverApi() {
  async function call(method, path, body, isForm) {
    const res = await fetch(CFG.apiBase + path, {
      method, credentials: 'same-origin',
      headers: isForm || !body ? {} : { 'Content-Type': 'application/json' },
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch (_) { /* empty */ }
    if (!res.ok) throw new ApiError((data && data.error) || 'http_' + res.status, data && data.message, res.status);
    return data;
  }
  const qs = o => { const p = new URLSearchParams(); Object.entries(o || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); }); const s = p.toString(); return s ? '?' + s : ''; };
  const download = (path) => { window.location.href = CFG.apiBase + path; };
  return {
    mode: 'server',
    getTerm: () => call('GET', '/term'),
    setActiveTerm: term => call('PUT', '/admin/term', { active_term: term }),
    login: (role, payload) => call('POST', '/auth/' + role, payload),
    me: () => call('GET', '/auth/session').catch(() => null),
    logout: () => call('POST', '/auth/logout'),
    changePin: (kind, new_pin) => call('PUT', '/admin/pins', { kind, new_pin }),
    sections: () => call('GET', '/sections'),
    students: f => call('GET', '/students' + qs(f)),
    importRoster: file => { const fd = new FormData(); fd.append('file', file); return call('POST', '/admin/roster', fd, true); },
    exams: f => call('GET', '/exams' + qs(f)),
    exam: id => call('GET', '/exams/' + encodeURIComponent(id)),
    createExam: payload => call('POST', '/exams', payload),
    updateExam: (id, patch) => call('PATCH', '/exams/' + encodeURIComponent(id), patch),
    deleteExam: id => call('DELETE', '/exams/' + encodeURIComponent(id)),
    studentExams: () => call('GET', '/student/exams'),
    myAttempts: term => call('GET', '/student/attempts' + qs({ term })),
    submitAttempt: payload => call('POST', '/attempts', payload),
    attempts: f => call('GET', '/attempts' + qs(f)),
    attempt: id => call('GET', '/attempts/' + encodeURIComponent(id)),
    examItemStats: (id, f) => call('GET', '/exams/' + encodeURIComponent(id) + '/item-stats' + qs(f)),
    reportData: term => call('GET', '/admin/report-data' + qs({ term })),
    downloadReport: (kind, f) => download('/admin/export/' + kind + qs(f)),
  };
}

// ---------------------------------------------------------------- SUPABASE MODE (live site)
// Calls the api_* Postgres functions of database/supabase.sql through Supabase's REST endpoint.
// The session token from api_login is kept in localStorage and sent with every call.
function supabaseApi() {
  const base = String(CFG.supabaseUrl || '').replace(/\/+$/, '') + '/rest/v1/rpc/';
  const TK = 'zec.token';
  const getTok = () => { try { return localStorage.getItem(TK); } catch (_) { return null; } };
  const setTok = v => { try { v ? localStorage.setItem(TK, v) : localStorage.removeItem(TK); } catch (_) { /* */ } };
  async function rpc(fn, args) {
    let res;
    try {
      res = await fetch(base + fn, { method: 'POST', headers: { apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + CFG.supabaseAnonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
    } catch (_) { throw new TypeError('network'); }
    const txt = await res.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (_) { /* */ }
    if (!res.ok) {
      const code = (data && data.message) || 'http_' + res.status;
      if (code === 'unauthorized') setTok(null);
      throw new ApiError(code, (data && (data.details || data.message)) || code, res.status === 400 && code === 'unauthorized' ? 401 : res.status);
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && data.error) throw new ApiError(data.error, data.message, 400);
    return data;
  }
  const T = (fn, extra) => rpc(fn, { p_token: getTok(), ...extra });
  // ---- exam cache: each exam is kept in this browser (IndexedDB) and downloaded again only when it has changed.
  // The cache is per role, so a student's copy (no answer key) is never mixed with a teacher's copy.
  const RK = 'zec.role';
  const getRole = () => { try { return localStorage.getItem(RK); } catch (_) { return null; } };
  const setRole = v => { try { v ? localStorage.setItem(RK, v) : localStorage.removeItem(RK); } catch (_) { /* */ } };
  let xdb = null;
  const xcDb = () => xdb || (xdb = new Promise((res, rej) => { const r = indexedDB.open('zec-exam-cache', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('x'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const xcGet = async k => { try { const d = await xcDb(); return await new Promise(res => { const r = d.transaction('x').objectStore('x').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); } catch (_) { return null; } };
  const xcPut = async (k, v) => { try { const d = await xcDb(); const tx = d.transaction('x', 'readwrite'), st = tx.objectStore('x'); st.put(v, k);
    const keys = await new Promise(res => { const r = st.getAllKeys(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); });
    if (keys.length > 60) keys.slice(0, keys.length - 60).forEach(x => { if (x !== k) st.delete(x); });   // keep the cache small
  } catch (_) { /* storage blocked: just no cache */ } };
  const xcClear = async () => { try { const d = await xcDb(); d.transaction('x', 'readwrite').objectStore('x').clear(); } catch (_) { /* */ } };
  async function cachedExam(id) {
    const role = getRole(), key = role + ':' + id;
    if (!role) return T('api_exam', { p_id: id });
    const c = await xcGet(key);
    if (c && c.v) {
      const v = await T('api_exam_version', { p_id: id });   // throws "forbidden" if the exam was hidden, just like api_exam
      if (v && v.updated_at === c.v) return c.data;
    }
    const data = await T('api_exam', { p_id: id });
    if (data && data.updated_at) xcPut(key, { v: data.updated_at, data });
    return data;
  }
  const api = {
    mode: 'supabase',
    getTerm: () => rpc('api_get_term'),
    setActiveTerm: term => T('api_set_term', { p: { active_term: term } }),
    async login(role, payload) { const s = await rpc('api_login', { p: { role, ...payload } }); setTok(s.token); setRole(role); delete s.token; return s; },
    async me() { if (!getTok()) return null; try { return await rpc('api_me', { p_token: getTok() }); } catch (_) { return null; } },
    async logout() { try { await rpc('api_logout', { p_token: getTok() }); } catch (_) { /* */ } setTok(null); return { ok: true }; },
    changePin: (kind, new_pin) => T('api_change_pin', { p: { kind, new_pin } }),
    sections: () => rpc('api_sections'),
    students: f => T('api_students', { p: f || {} }),
    async importRoster(file) {
      const r = await RosterParser.parseRosterWorkbook(await file.arrayBuffer());
      if (!r.students.length) throw new ApiError('empty_roster', 'No Grade 5–12 students found in this file');
      return T('api_import_roster', { p: { students: r.students, notes: r.notes || [] } });
    },
    exams: f => T('api_exams', { p: f || {} }),
    exam: id => cachedExam(id),
    setExamPictures: (id, questions) => T('api_set_exam_pictures', { p_id: id, p: { questions } }).then(r => { xcClear(); return r; }),
    createExam: payload => T('api_create_exam', { p: payload }),
    updateExam: (id, patch) => T('api_update_exam', { p_id: id, p: patch }),
    deleteExam: id => T('api_delete_exam', { p_id: id }),
    studentExams: () => T('api_student_exams'),
    myAttempts: term => T('api_my_attempts', { p: { term } }),
    submitAttempt: payload => T('api_submit_attempt', { p: payload }),
    guestSubmit: payload => T('api_guest_submit', { p: payload }),
    setGuestEnabled: on => T('api_set_guest', { p: { enabled: !!on } }),
    visitorStats: () => T('api_visitor_stats'),
    attempts: f => T('api_attempts', { p: f || {} }),
    attempt: id => T('api_attempt', { p_id: id }),
    examItemStats: (id, f) => T('api_item_stats', { p_id: id, p: f || {} }),
    reportData: term => T('api_report_data', { p: { term } }),
    async downloadReport(kind, f = {}) {
      const data = await api.reportData(f.term || 'ALL');
      const input = { ...data, term: f.term || 'ALL', filters: { grade: f.grade, track: f.track, section: f.section, subject: f.subject } };
      const b = kind === 'student-performance' ? Reports.buildStudentPerformanceWorkbook(input) : kind === 'teacher-uploads' ? Reports.buildTeacherUploadsWorkbook(input) : Reports.buildFullWorkbook(input);
      await window.API.saveWorkbook(b.wb, b.filename);
    },
  };
  return api;
}

// ---------------------------------------------------------------- DEMO MODE
function demoApi() {
  const DB_NAME = 'zec-suhaila-exams', STORE = 'kv';
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const get = async k => { const d = await db(); return new Promise((res, rej) => { const r = d.transaction(STORE).objectStore(STORE).get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); };
  const put = async (k, v) => { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(v, k); tx.oncomplete = () => res(v); tx.onerror = () => rej(tx.error); }); };
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

  let ready = null;
  const init = () => ready || (ready = (async () => {
    let settings = await get('settings');
    if (!settings) {
      const salt = uuid();
      settings = { salt, admin_pin_hash: await sha(salt + ':admin:2026'), teacher_pin_hash: await sha(salt + ':teacher:5113'), active_term: 'Term 1' };
      await put('settings', settings);
    }
    if (!(await get('students'))) {
      await put('students', window.STUDENTS_DATA || await (await fetch('data/students.json')).json());
    }
    if (!(await get('exams'))) await put('exams', []);
    if (!(await get('attempts'))) await put('attempts', []);
    if (!(await get('visitor_attempts'))) await put('visitor_attempts', []);
  })());

  // session (12 h) — localStorage so preview tabs share it
  const SKEY = 'zec.session';
  const getSession = () => { try { const s = JSON.parse(localStorage.getItem(SKEY)); if (s && s.exp > Date.now()) return s; } catch (_) { /* */ } return null; };
  const setSession = s => { localStorage.setItem(SKEY, JSON.stringify({ ...s, exp: Date.now() + 12 * 3600e3 })); return s; };
  const need = (...roles) => { const s = getSession(); if (!s || !roles.includes(s.role)) throw new ApiError('unauthorized', 'Please sign in again.', 401); return s; };

  // brute-force guard: 5 wrong tries -> 60 s lock per role
  const guard = role => { const k = 'zec.lock.' + role; const g = JSON.parse(localStorage.getItem(k) || '{"n":0,"until":0}'); if (g.until > Date.now()) throw new ApiError('locked', String(Math.ceil((g.until - Date.now()) / 1000)), 429); return { fail() { g.n++; if (g.n >= 5) { g.until = Date.now() + 60e3; g.n = 0; } localStorage.setItem(k, JSON.stringify(g)); }, ok() { localStorage.removeItem(k); } }; };

  const summarize = (e, attempts, students) => {
    const mine = attempts.filter(a => a.exam_id === e.id);
    const best = Reports.bestByStudentExam(mine);
    const classTotal = students.filter(s => Reports.examVisibleTo(e, s)).length;
    const bests = [...best.values()].map(v => v.best.percentage);
    return {
      id: e.id, title: e.title, subject: e.subject, grade_num: e.grade_num, track: e.track, term: e.term,
      target_sections: e.target_sections, teacher_name: e.teacher_name, is_published: e.is_published,
      q_count: e.questions.length, total_marks: totalMarks(e.questions), created_at: e.created_at, updated_at: e.updated_at,
      duration_minutes: e.config.durationMinutes, calculator_allowed: !!e.config.calculatorAllowed, passing_percent: e.config.passingPercent,
      unique_students: best.size, class_total: classTotal, attempts_count: mine.length,
      avg_best_pct: bests.length ? bests.reduce((a, b) => a + b, 0) / bests.length : null,
    };
  };
  // a visitor's own history = same name (case-insensitive) + same class code
  const visitorMatch = (v, s) => v.name_key === s.name_key && v.grade_num === Number(s.grade_num) && v.track === s.track;
  // guests: published, active term, same grade, track All or theirs (sections don't apply)
  const guestVisible = (e, s, term) => !!e.is_published && e.grade_num === Number(s.grade_num) && (e.track === 'All' || e.track === s.track) && e.term === term;
  const subjMatch = (s, f) => !f || f === 'ALL' || s === f || (f === 'Science' && window.Catalog && window.Catalog.departmentOf(s) === 'Science');
  const matchExam = (e, f = {}) => (!f.term || f.term === 'ALL' || e.term === f.term) && (!f.grade || e.grade_num === Number(f.grade)) &&
    (!f.track || f.track === 'ALL' || e.track === f.track) && subjMatch(e.subject, f.subject) &&
    (!f.teacher || e.teacher_name.toLowerCase().includes(String(f.teacher).toLowerCase())) && (f.published === undefined || !!e.is_published === !!f.published);
  const enrichAttempt = (a, exams) => { const e = exams.find(x => x.id === a.exam_id) || {}; const { answers_json, ...rest } = a; return { ...rest, exam_title: e.title, subject: e.subject, term: e.term, teacher_name: e.teacher_name }; };

  const api = {
    mode: 'demo',
    async getTerm() { await init(); const s = await get('settings'); return { active_term: s.active_term, guest_enabled: s.guest_enabled !== false }; },
    async setGuestEnabled(on) {
      await init(); need('admin'); const s = await get('settings'); s.guest_enabled = !!on; await put('settings', s);
      if (!on) { const cur = getSession(); if (cur && cur.role === 'guest') localStorage.removeItem(SKEY); }
      return { guest_enabled: !!on };
    },
    // visitors: saved ONLY in their own history (name + class), never in the school's attempts
    async visitorStats() {
      await init(); need('admin');
      const vv = (await get('visitor_visits')) || [], va = (await get('visitor_attempts')) || [];
      const key = v => v.grade_num + '|' + v.track + '|' + v.name_key, day = d => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
      const who = new Map([...vv, ...va].map(v => [key(v), v])), today = day(Date.now()), weekAgo = Date.now() - 7 * 864e5;
      const by = {}; who.forEach(v => { const k = v.grade_num + '|' + v.track; by[k] = by[k] || { grade_num: v.grade_num, track: v.track, n: 0 }; by[k].n++; });
      return { visitors: who.size, visits: vv.length, today: new Set(vv.filter(v => day(v.visited_at) === today).map(key)).size,
        week: new Set(vv.filter(v => new Date(v.visited_at) > weekAgo).map(key)).size, practice: va.length,
        by_class: Object.values(by).sort((a, b) => a.grade_num - b.grade_num || a.track.localeCompare(b.track)) };
    },
    async guestSubmit(p) {
      await init(); const s = need('guest');
      const e = (await get('exams')).find(x => x.id === p.exam_id);
      if (!e) throw new ApiError('not_found');
      if (!guestVisible(e, s, (await get('settings')).active_term)) throw new ApiError('forbidden', 'This exam is not available', 403);
      let got = 0; const answers = p.answers || {};
      e.questions.forEach((q, i) => { const a = answers[i]; if (a && a.picked === q.correct) got += Number(q.marks) || 0; });
      const total = totalMarks(e.questions), pct = total ? Math.round(got / total * 10000) / 100 : 0;
      const va = (await get('visitor_attempts')) || [];
      const n = va.filter(v => visitorMatch(v, s) && v.exam_id === e.id).length + 1;
      const row = { id: uuid(), exam_id: e.id, grade_num: s.grade_num, track: s.track, name_key: s.name_key, visitor_name: s.name, attempt_number: n,
        score_gained: got, total_marks: total, percentage: pct, passed: pct >= (Number(e.config.passingPercent) || 50) ? 1 : 0,
        time_spent_seconds: Math.max(0, p.time_spent_seconds | 0), submitted_at: nowIso() };
      va.push(row); await put('visitor_attempts', va);
      return { guest: true, id: row.id, exam_id: e.id, attempt_number: n, score_gained: got, total_marks: total, percentage: pct, passed: row.passed,
        key: e.questions.map(q => ({ correct: q.correct, feedback: q.feedback || '' })) };
    },
    async setActiveTerm(term) { await init(); need('admin'); if (!TERMS.includes(term)) throw new ApiError('bad_term'); const s = await get('settings'); s.active_term = term; await put('settings', s); return { active_term: term }; },

    async login(role, p = {}) {
      await init(); const g = guard(role); const s = await get('settings');
      if (role === 'admin' || role === 'teacher') {
        const pin = normalizeId(p.pin);
        if (!/^\d{4}$/.test(pin) || (await sha(`${s.salt}:${role}:${pin}`)) !== s[role + '_pin_hash']) { g.fail(); throw new ApiError('bad_pin', 'Incorrect PIN', 401); }
        g.ok();
        if (role === 'admin') return setSession({ role: 'admin', name: 'Administrator' });
        if (!String(p.teacher_name || '').trim()) throw new ApiError('name_required');
        if (window.Catalog && !window.Catalog.teacherNames().includes(String(p.teacher_name).trim())) throw new ApiError('unknown_teacher', 'Teacher name is not on the school teacher list', 400);
        return setSession({ role: 'teacher', name: String(p.teacher_name).trim(), grade: Number(p.grade) || null, track: p.track || 'General', subject: p.subject || '' });
      }
      if (role === 'guest') {
        if (s.guest_enabled === false) throw new ApiError('guest_disabled', 'Guest practice is switched off', 403);
        const cls = parseGuestCode(p.code); if (!cls) throw new ApiError('bad_guest_code', 'Unknown guest code', 400);
        const nm = String(p.name || '').trim().replace(/\s+/g, ' ');
        if (nm.length < 2 || nm.length > 40 || /[<>]/.test(nm)) throw new ApiError('guest_name_required', 'Please type your name (2–40 letters)', 400);
        const vv = (await get('visitor_visits')) || []; vv.push({ grade_num: cls.grade_num, track: cls.track, name_key: nm.toLowerCase(), visited_at: nowIso() }); await put('visitor_visits', vv);
        return setSession({ role: 'guest', name: nm, name_key: nm.toLowerCase(), ...cls });
      }
      if (role === 'student') {
        const id = normalizeId(p.student_id);
        const st = (await get('students')).find(x => x.student_id === id);
        if (!st) { g.fail(); throw new ApiError('unknown_student', 'Student ID not found', 404); }
        g.ok(); return setSession({ role: 'student', ...st });
      }
      throw new ApiError('bad_role');
    },
    async me() { await init(); return getSession(); },
    async logout() { localStorage.removeItem(SKEY); return { ok: true }; },
    async changePin(kind, newPin) {
      await init(); need('admin'); newPin = normalizeId(newPin);
      if (!['admin', 'teacher'].includes(kind) || !/^\d{4}$/.test(newPin)) throw new ApiError('bad_pin_format', 'PIN must be exactly 4 digits');
      const s = await get('settings'); s[kind + '_pin_hash'] = await sha(`${s.salt}:${kind}:${newPin}`); await put('settings', s); return { ok: true };
    },

    async sections() {
      await init(); const map = new Map();
      for (const s of await get('students')) { const k = s.section; if (!map.has(k)) map.set(k, { section: k, grade_num: s.grade_num, track: s.track, student_count: 0 }); map.get(k).student_count++; }
      return [...map.values()].sort((a, b) => a.grade_num - b.grade_num || a.track.localeCompare(b.track) || a.section.localeCompare(b.section, 'ar', { numeric: true }));
    },
    async students(f = {}) {
      await init(); need('admin', 'teacher'); const q = normalizeId(f.q || '');
      return (await get('students')).filter(s => (!f.grade || s.grade_num === Number(f.grade)) && (!f.track || f.track === 'ALL' || s.track === f.track) && (!f.section || f.section === 'ALL' || s.section === f.section) && (!q || s.student_id.includes(q)));
    },
    async importRoster(file) {
      await init(); need('admin');
      const r = await RosterParser.parseRosterWorkbook(await file.arrayBuffer());
      if (!r.students.length) throw new ApiError('empty_roster', 'No Grade 5–12 students found in this file');
      const old = await get('students'); const oldIds = new Set(old.map(s => s.student_id)), newIds = new Set(r.students.map(s => s.student_id));
      await put('students', r.students);
      return { students: r.students.length, sections: r.sections.length, added: [...newIds].filter(x => !oldIds.has(x)).length, removed: [...oldIds].filter(x => !newIds.has(x)).length, notes: r.notes };
    },

    async exams(f = {}) {
      await init(); need('admin', 'teacher');
      const [exams, attempts, students] = await Promise.all([get('exams'), get('attempts'), get('students')]);
      return exams.filter(e => matchExam(e, f)).map(e => summarize(e, attempts, students)).sort((a, b) => String(b.created_at).localeCompare(a.created_at));
    },
    async exam(id) {
      await init(); const s = need('admin', 'teacher', 'student', 'guest');
      const e = (await get('exams')).find(x => x.id === id);
      if (!e) throw new ApiError('not_found', 'Exam not found', 404);
      if (s.role === 'guest') {
        if (!guestVisible(e, s, (await get('settings')).active_term)) throw new ApiError('forbidden', 'This exam is not available', 403);
        return { ...e, teacher_name: '', questions: e.questions.map(({ correct, feedback, ...q }) => q) };   // key only after submitting
      }
      if (s.role === 'student' && (!e.is_published || !Reports.examVisibleTo(e, s) || e.term !== (await get('settings')).active_term)) throw new ApiError('forbidden', 'This exam is not available', 403);
      return e;
    },
    async createExam(p) {
      await init(); need('admin', 'teacher');
      if (!p.title || !p.subject || !(p.grade_num >= 5 && p.grade_num <= 12) || !Array.isArray(p.questions) || !p.questions.length) throw new ApiError('invalid_exam', 'Missing title, subject, grade or questions');
      if (window.Catalog && !window.Catalog.isTaught(p.subject, p.grade_num, p.track || 'General')) throw new ApiError('subject_not_taught', 'This subject is not taught in the selected grade/track', 400);
      const e = {
        id: uuid(), title: p.title, subject: p.subject, grade_num: Number(p.grade_num), track: p.track || 'General', term: TERMS.includes(p.term) ? p.term : 'Term 1',
        target_sections: p.target_sections && p.target_sections.length ? p.target_sections : ['ALL'], teacher_name: p.teacher_name || 'Teacher',
        config: p.config || {}, passages: p.passages || {}, questions: p.questions, is_published: p.is_published === false ? 0 : 1, created_at: nowIso(), updated_at: nowIso(),
      };
      const exams = await get('exams'); exams.push(e); await put('exams', exams); return { id: e.id };
    },
    async setExamPictures(id, questions) {
      await init(); need('admin'); const exams = await get('exams'); const e = exams.find(x => x.id === id);
      if (!e) throw new ApiError('not_found', 'Exam not found', 404);
      const bare = q => { const c = { ...q }; delete c.image_url; delete c.option_images; return JSON.stringify(c); };
      if (!Array.isArray(questions) || questions.length !== e.questions.length || questions.some((q, i) => bare(q) !== bare(e.questions[i]))) throw new ApiError('invalid_exam', 'Only pictures may change', 400);
      e.questions = questions; e.updated_at = nowIso(); await put('exams', exams); return { ok: true, bytes: JSON.stringify(questions).length };
    },
    async updateExam(id, patch) {
      await init(); const s = need('admin', 'teacher'); const exams = await get('exams'); const e = exams.find(x => x.id === id);
      if (!e) throw new ApiError('not_found');
      if (s.role === 'teacher' && e.teacher_name !== s.name) throw new ApiError('not_owner', 'Only the teacher who uploaded this exam (or the administrator) can change or delete it.', 403);
      if (window.Catalog && (patch.subject || patch.grade_num || patch.track) && !window.Catalog.isTaught(patch.subject || e.subject, patch.grade_num || e.grade_num, patch.track || e.track)) throw new ApiError('subject_not_taught', 'This subject is not taught in the selected grade/track', 400);
      ['title', 'subject', 'grade_num', 'track', 'term', 'target_sections', 'teacher_name', 'is_published'].forEach(k => { if (patch[k] !== undefined) e[k] = k === 'grade_num' ? Number(patch[k]) : patch[k]; });
      e.updated_at = nowIso(); await put('exams', exams); return { ok: true };
    },
    async deleteExam(id) {
      await init(); const s = need('admin', 'teacher');
      const e = (await get('exams')).find(x => x.id === id);
      if (e && s.role === 'teacher' && e.teacher_name !== s.name) throw new ApiError('not_owner', 'Only the teacher who uploaded this exam (or the administrator) can change or delete it.', 403);
      await put('exams', (await get('exams')).filter(x => x.id !== id));
      await put('attempts', (await get('attempts')).filter(a => a.exam_id !== id)); // ON DELETE CASCADE
      await put('visitor_attempts', ((await get('visitor_attempts')) || []).filter(a => a.exam_id !== id));
      return { ok: true };
    },

    async studentExams() {
      await init(); const s = need('student', 'guest'); const term = (await get('settings')).active_term; const guest = s.role === 'guest';
      const [exams, attempts, visitors] = await Promise.all([get('exams'), get('attempts'), get('visitor_attempts')]);
      const mine = guest ? (visitors || []).filter(v => visitorMatch(v, s)) : attempts.filter(a => a.student_id === s.student_id);
      const list = exams.filter(e => guest ? guestVisible(e, s, term) : (e.is_published && e.term === term && Reports.examVisibleTo(e, s))).map(e => {
        const at = mine.filter(a => a.exam_id === e.id); const b = at.length ? at.reduce((x, y) => (y.percentage > x.percentage ? y : x)) : null;
        return { id: e.id, title: e.title, subject: e.subject, teacher_name: guest ? '' : e.teacher_name, term: e.term, q_count: e.questions.length, total_marks: totalMarks(e.questions),
          duration_minutes: e.config.durationMinutes, calculator_allowed: !!e.config.calculatorAllowed, my_attempts: at.length,
          my_best_score: b ? b.score_gained : null, my_best_pct: b ? b.percentage : null, my_best_passed: b ? !!b.passed : null, created_at: e.created_at };
      }).sort((a, b) => a.subject.localeCompare(b.subject) || String(b.created_at).localeCompare(a.created_at));
      return { active_term: term, exams: list };
    },
    async myAttempts(term) {
      await init(); const s = need('student', 'guest'); const exams = await get('exams');
      const rows = s.role === 'guest' ? ((await get('visitor_attempts')) || []).filter(v => visitorMatch(v, s)) : (await get('attempts')).filter(a => a.student_id === s.student_id);
      return rows.map(a => enrichAttempt(a, exams))
        .filter(a => !term || term === 'ALL' || a.term === term).sort((a, b) => String(b.submitted_at).localeCompare(a.submitted_at));
    },
    async submitAttempt(p) {
      await init(); const s = need('student');
      const exams = await get('exams'); const e = exams.find(x => x.id === p.exam_id);
      if (!e) throw new ApiError('not_found');
      // Score on the "server" side from the original answer key (never trust client score)
      let got = 0; const answers = p.answers || {};
      e.questions.forEach((q, i) => { const a = answers[i]; if (a && a.picked === q.correct) got += Number(q.marks) || 0; });
      const total = totalMarks(e.questions), pct = total ? got / total * 100 : 0;
      const attempts = await get('attempts');
      const n = attempts.filter(a => a.student_id === s.student_id && a.exam_id === e.id).length + 1;
      const a = { id: uuid(), exam_id: e.id, student_id: s.student_id, grade_num: s.grade_num, track: s.track, section: s.section, attempt_number: n,
        score_gained: got, total_marks: total, percentage: Math.round(pct * 100) / 100, passed: pct >= (Number(e.config.passingPercent) || 50) ? 1 : 0,
        time_spent_seconds: Math.max(0, p.time_spent_seconds | 0), answers_json: JSON.stringify(answers), submitted_at: nowIso() };
      attempts.push(a); await put('attempts', attempts);
      const { answers_json, ...rest } = a; return rest;
    },
    async attempts(f = {}) {
      await init(); need('admin', 'teacher'); const exams = await get('exams');
      const sid = normalizeId(f.student_id || '');
      return (await get('attempts')).map(a => enrichAttempt(a, exams)).filter(a =>
        (!f.term || f.term === 'ALL' || a.term === f.term) && (!f.grade || a.grade_num === Number(f.grade)) && (!f.track || f.track === 'ALL' || a.track === f.track) &&
        (!f.section || f.section === 'ALL' || a.section === f.section) && subjMatch(a.subject, f.subject) &&
        (!f.exam_id || f.exam_id === 'ALL' || a.exam_id === f.exam_id) && (!sid || a.student_id.includes(sid)));
    },
    async attempt(id) {
      await init(); const s = need('admin', 'teacher', 'student'); const a = (await get('attempts')).find(x => x.id === id);
      if (!a || (s.role === 'student' && a.student_id !== s.student_id)) throw new ApiError('not_found');
      return { ...a, answers: JSON.parse(a.answers_json || '{}') };
    },
    // Per-question correctness across ALL attempts in scope (grade/track/section filters), original question order.
    async examItemStats(id, f = {}) {
      await init(); need('admin', 'teacher');
      const e = (await get('exams')).find(x => x.id === id); if (!e) throw new ApiError('not_found');
      const at = (await get('attempts')).filter(a => a.exam_id === id && (!f.track || f.track === 'ALL' || a.track === f.track) && (!f.section || f.section === 'ALL' || a.section === f.section));
      return e.questions.map((q, i) => {
        let correct = 0, answered = 0; const picks = q.options.map(() => 0);
        at.forEach(a => { const ans = JSON.parse(a.answers_json || '{}')[i]; if (ans && ans.picked !== null && ans.picked !== undefined) { answered++; picks[ans.picked] = (picks[ans.picked] || 0) + 1; if (ans.picked === q.correct) correct++; } });
        return { index: i, q_num: q.q_num || i + 1, section_part: q.section_part || '', topic: q.topic || '', text: q.en || q.ar || '', correct_option: q.correct, attempts: at.length, answered, correct, correct_rate: at.length ? correct / at.length * 100 : null, picks };
      });
    },
    async reportData(term) {
      await init(); need('admin');
      const [exams, attempts, students] = await Promise.all([get('exams'), get('attempts'), get('students')]);
      return { term, students, attempts: attempts.map(a => { const { answers_json, ...r } = a; return r; }),
        exams: exams.map(e => ({ id: e.id, title: e.title, subject: e.subject, grade_num: e.grade_num, track: e.track, term: e.term, target_sections: e.target_sections, teacher_name: e.teacher_name, is_published: e.is_published, total_marks: totalMarks(e.questions), created_at: e.created_at })) };
    },
    async downloadReport(kind, f = {}) {
      const data = await api.reportData(f.term || 'ALL');
      const input = { ...data, term: f.term || 'ALL', filters: { grade: f.grade, track: f.track, section: f.section, subject: f.subject } };
      const b = kind === 'student-performance' ? Reports.buildStudentPerformanceWorkbook(input) : kind === 'teacher-uploads' ? Reports.buildTeacherUploadsWorkbook(input) : Reports.buildFullWorkbook(input);
      await window.API.saveWorkbook(b.wb, b.filename);
    },
  };
  return api;
}

async function saveWorkbook(wb, filename) {
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

window.API = CFG.mode === 'server' ? serverApi() : CFG.mode === 'supabase' ? supabaseApi() : demoApi();
window.API.TERMS = TERMS;
window.API.normalizeId = normalizeId;
window.API.parseGuestCode = parseGuestCode;
window.API.saveWorkbook = saveWorkbook;
window.ApiError = ApiError;
})();
