-- =====================================================================
--  Zayed Educational Complex – Suhaila | Exam Training Platform
--  SUPABASE (PostgreSQL) backend — run this whole file once in
--  Supabase Dashboard → SQL Editor → New query → Run.  Safe to re-run.
--
--  Security model
--  • Every table has Row Level Security ON and NO policies, and the anon /
--    authenticated roles have no table privileges: the browser can never read
--    or write a table directly.
--  • The website only calls the api_* functions below (SECURITY DEFINER). Each
--    one checks the caller's session token (issued by api_login after a PIN or
--    Student ID check) before touching data.
--  • PINs are stored only as bcrypt hashes. Defaults: Admin 2026, Teacher 5113
--    — CHANGE THEM in the Admin panel → Security right after the first sign-in.
--  • Students never receive the answer key before submitting; attempts are
--    scored here, from the stored key.
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------------ tables
create table if not exists public.students (
  student_id     text primary key,
  grade_num      int  not null check (grade_num between 5 and 12),
  grade_label_en text not null,
  grade_label_ar text not null,
  track          text not null check (track in ('General','Advanced')),
  section        text not null
);
create index if not exists idx_students_class on public.students (grade_num, track, section);

create table if not exists public.teacher_assignments (
  teacher_name text not null,
  subject      text not null,
  class_code   text not null,
  grade_num    int  not null,
  track        text not null,
  section      text not null,
  primary key (teacher_name, subject, class_code)
);

create table if not exists public.exams (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  subject         text not null check (subject in ('Mathematics','Science','English','Arabic','Islamic Education',
                                                   'Social Studies','Physics','Chemistry','Biology','Computer Science','Other')),
  grade_num       int  not null check (grade_num between 5 and 12),
  track           text not null check (track in ('General','Advanced','All')),
  term            text not null default 'Term 1' check (term in ('Term 1','Term 2','Term 3')),
  target_sections jsonb not null default '["ALL"]',
  teacher_name    text not null,
  config          jsonb not null default '{}',
  passages        jsonb not null default '{}',
  questions       jsonb not null,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_exams_target on public.exams (grade_num, track, term, is_published);

-- attempts.student_id is NOT a foreign key: replacing the roster must keep old attempts.
create table if not exists public.attempts (
  id                 uuid primary key default gen_random_uuid(),
  exam_id            uuid not null references public.exams(id) on delete cascade,
  student_id         text not null,
  grade_num          int  not null,
  track              text not null,
  section            text not null,
  attempt_number     int  not null,
  score_gained       numeric not null,
  total_marks        numeric not null,
  percentage         numeric not null,
  passed             boolean not null,
  time_spent_seconds int  not null,
  answers            jsonb not null,
  submitted_at       timestamptz not null default now(),
  unique (student_id, exam_id, attempt_number)
);
create index if not exists idx_attempts_exam on public.attempts (exam_id, student_id);
create index if not exists idx_attempts_student on public.attempts (student_id);

create table if not exists public.settings (key text primary key, value text not null);
create table if not exists public.sessions (
  token      text primary key,
  role       text not null,
  data       jsonb not null,
  expires_at timestamptz not null
);
create table if not exists public.login_guard (key text primary key, fails int not null default 0, locked_until timestamptz);

-- Visitors (guest codes) save their practice here, under the NAME they type + their class code. Kept apart from the
-- school's `attempts`: no staff function reads this table, so it never appears in results, reports or participation.
-- Anyone typing the same name with the same class code shares that history (by design: name only, no PIN).
create table if not exists public.visitor_attempts (
  id                 uuid primary key default gen_random_uuid(),
  exam_id            uuid not null references public.exams(id) on delete cascade,
  grade_num          int  not null,
  track              text not null,
  name_key           text not null,          -- lower-case, single-spaced name (the lookup key)
  visitor_name       text not null,          -- name as typed
  attempt_number     int  not null,
  score_gained       numeric not null,
  total_marks        numeric not null,
  percentage         numeric not null,
  passed             boolean not null,
  time_spent_seconds int  not null,
  submitted_at       timestamptz not null default now()
);
create index if not exists idx_visitor_attempts_who on public.visitor_attempts (grade_num, track, name_key, exam_id);

-- one row per visitor sign-in (class + name key only), for the admin visitor counter
create table if not exists public.visitor_visits (
  id         bigserial primary key,
  grade_num  int  not null,
  track      text not null,
  name_key   text not null,
  visited_at timestamptz not null default now()
);
create index if not exists idx_visitor_visits_at on public.visitor_visits (visited_at);

insert into public.settings (key, value) values
  ('active_term', 'Term 1'),
  ('guest_enabled', 'true'),     -- guest practice codes (5g … 12a) on/off; admin switch
  ('admin_pin_hash',   extensions.crypt('2026', extensions.gen_salt('bf'))),
  ('teacher_pin_hash', extensions.crypt('5113', extensions.gen_salt('bf')))
on conflict (key) do nothing;

-- lock every table: no direct access from the browser
do $$ declare t text; begin
  foreach t in array array['students','teacher_assignments','exams','attempts','settings','sessions','login_guard','visitor_attempts','visitor_visits'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ helpers (not callable from the browser)
create or replace function public._err(p_code text, p_msg text default null) returns void
language plpgsql as $$ begin raise exception using message = p_code, detail = coalesce(p_msg, p_code); end $$;

create or replace function public._norm_id(v text) returns text language sql immutable as $$
  select regexp_replace(upper(regexp_replace(translate(coalesce(v, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '\s', '', 'g')), '^(\d+)\.0+$', '\1')
$$;

create or replace function public._client_ip() returns text language sql stable as $$
  select coalesce(nullif(trim(split_part(coalesce(current_setting('request.headers', true), '{}')::json->>'x-forwarded-for', ',', 1)), ''), 'unknown')
$$;

-- session lookup: returns the session object or raises 'unauthorized'
create or replace function public._sess(p_token text, p_roles text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s is null or not (s.role = any(p_roles)) then perform _err('unauthorized', 'Please sign in again.'); end if;
  return s.data || jsonb_build_object('role', s.role);
end $$;

create or replace function public._total(q jsonb) returns numeric language sql immutable as $$
  select coalesce(sum(coalesce(nullif(x->>'marks', '')::numeric, 0)), 0) from jsonb_array_elements(coalesce(q, '[]')) x
$$;

-- is exam visible to a student (grade, track, section)?
create or replace function public._visible(e public.exams, g int, tr text, sec text) returns boolean language sql immutable as $$
  select e.grade_num = g and (e.track = 'All' or e.track = tr) and (e.target_sections ? 'ALL' or e.target_sections ? sec)
$$;

-- subjects taught per grade/track (MOE timetable; mirrors public/js/shared/catalog.js)
create or replace function public._taught(p_subject text, g int, tr text) returns boolean language sql immutable as $$
  select p_subject in ('Mathematics','English','Arabic','Islamic Education','Social Studies') and g between 5 and 12
      or p_subject = 'Science'   and (g between 5 and 8 or (g in (9, 10) and tr in ('General', 'All')))
      or p_subject = 'Physics'   and ((g in (9, 10, 11) and tr in ('Advanced', 'All')) or g = 12)
      or p_subject = 'Chemistry' and ((g = 10 and tr in ('Advanced', 'All')) or g in (11, 12))
      or p_subject = 'Biology'   and ((g = 9 and tr in ('Advanced', 'All')) or g in (11, 12))
$$;

create or replace function public._subj_match(p_subject text, f text) returns boolean language sql immutable as $$
  select f is null or f = '' or f = 'ALL' or p_subject = f or (f = 'Science' and p_subject in ('Science','Physics','Chemistry','Biology'))
$$;

-- Question count and total marks are stored on each exam (kept up to date by a trigger), so exam lists never have to
-- unpack the questions. Exams with pictures can be several MB each; reading them all made lists hit the statement timeout.
alter table public.exams add column if not exists q_count int, add column if not exists total_marks numeric;
create or replace function public._exam_counts() returns trigger language plpgsql as $$
begin
  new.q_count := jsonb_array_length(coalesce(new.questions, '[]')); new.total_marks := _total(new.questions); return new;
end $$;
drop trigger if exists trg_exam_counts on public.exams;
create trigger trg_exam_counts before insert or update of questions on public.exams for each row execute function public._exam_counts();
update public.exams set q_count = jsonb_array_length(questions), total_marks = _total(questions) where q_count is null or total_marks is null;

-- old helper took the whole exam row (which unpacks the questions); exam lists now read only the columns they need
drop function if exists public._exam_summary(public.exams);

create or replace function public._attempt_row(a public.attempts, with_answers boolean default false) returns jsonb
language sql stable security definer set search_path = public as $$
  select (to_jsonb(a) - 'answers' - 'passed') || jsonb_build_object('passed', case when a.passed then 1 else 0 end)
         || jsonb_build_object('exam_title', e.title, 'subject', e.subject, 'term', e.term, 'teacher_name', e.teacher_name)
         || case when with_answers then jsonb_build_object('answers', a.answers) else '{}'::jsonb end
  from exams e where e.id = a.exam_id
$$;

-- ------------------------------------------------------------------ public API (called by public/js/api.js → supabaseApi)
create or replace function public.api_get_term() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('active_term', (select value from settings where key = 'active_term'),
                            'guest_enabled', coalesce((select value from settings where key = 'guest_enabled'), 'true') = 'true')
$$;

-- ------------------------------------------------------------------ guests (visitors from outside the school)
-- A guest code names a class: 5g … 8g (General), 9g/9a … 12g/12a (General/Advanced). Arabic digits and the Arabic letters
-- ع (عام) / م (متقدم) are accepted too, e.g. ٩م. Guests take exams and see their result, but NOTHING is saved.
create or replace function public._guest_class(p_code text) returns jsonb language sql immutable as $$
  with c as (select lower(regexp_replace(translate(coalesce(p_code, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹عم', '01234567890123456789ga'), '\s', '', 'g')) v)
  select case when v ~ '^[5-8]g$' then jsonb_build_object('grade_num', substring(v from '^\d+')::int, 'track', 'General')
              when v ~ '^(9|10|11|12)[ga]$' then jsonb_build_object('grade_num', substring(v from '^\d+')::int,
                                                                      'track', case when right(v, 1) = 'a' then 'Advanced' else 'General' end)
         end from c
$$;

-- exam visible to a guest: published, active term, same grade, track All or the guest's track (sections don't apply)
create or replace function public._guest_visible(e public.exams, g int, tr text) returns boolean language sql stable security definer set search_path = public as $$
  select e.is_published and e.grade_num = g and (e.track = 'All' or e.track = tr) and e.term = (select value from settings where key = 'active_term')
$$;

create or replace function public.api_set_guest(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare on_ boolean := coalesce((p->>'enabled')::boolean, true);
begin
  perform _sess(p_token, array['admin']);
  insert into settings (key, value) values ('guest_enabled', case when on_ then 'true' else 'false' end)
    on conflict (key) do update set value = excluded.value;
  if not on_ then delete from sessions where role = 'guest'; end if;   -- switching off signs current guests out
  return jsonb_build_object('guest_enabled', on_);
end $$;

-- scores a visitor's answers from the stored key, saves the result in visitor_attempts (under their name + class),
-- and returns the result + key. Nothing goes into the school's attempts table.
-- admin: outside-visitor counter (numbers only, no names)
create or replace function public.api_visitor_stats(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare today date := (now() at time zone 'Asia/Dubai')::date;
begin
  perform _sess(p_token, array['admin']);
  return (with who as (select grade_num, track, name_key from visitor_visits union select grade_num, track, name_key from visitor_attempts)
    select jsonb_build_object(
      'visitors', (select count(*) from who),
      'visits',   (select count(*) from visitor_visits),
      'today',    (select count(distinct (grade_num, track, name_key)) from visitor_visits where (visited_at at time zone 'Asia/Dubai')::date = today),
      'week',     (select count(distinct (grade_num, track, name_key)) from visitor_visits where (visited_at at time zone 'Asia/Dubai')::date > today - 7),
      'practice', (select count(*) from visitor_attempts),
      'by_class', coalesce((select jsonb_agg(jsonb_build_object('grade_num', grade_num, 'track', track, 'n', n) order by grade_num, track)
                            from (select grade_num, track, count(*) n from who group by 1, 2) x), '[]')));
end $$;

create or replace function public.api_guest_submit(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb := _sess(p_token, array['guest']); e exams; got numeric := 0; tot numeric; pct numeric; q jsonb; i int; ans jsonb;
  n int; v visitor_attempts; pass numeric;
begin
  select * into e from exams where id = (p->>'exam_id')::uuid;
  if e is null then perform _err('not_found', 'Exam not found'); end if;
  if not _guest_visible(e, (s->>'grade_num')::int, s->>'track') then perform _err('forbidden', 'This exam is not available'); end if;
  for q, i in select x, (o - 1)::int from jsonb_array_elements(e.questions) with ordinality t(x, o) loop
    ans := p->'answers'->(i::text);
    if ans is not null and jsonb_typeof(ans->'picked') = 'number' and (ans->>'picked')::int = (q->>'correct')::int then
      got := got + coalesce((q->>'marks')::numeric, 0);
    end if;
  end loop;
  tot := _total(e.questions);
  pct := case when tot > 0 then round(got / tot * 100, 2) else 0 end;
  pass := coalesce((e.config->>'passingPercent')::numeric, 50);
  perform pg_advisory_xact_lock(hashtext('v:' || (s->>'name_key') || (s->>'grade_num') || (s->>'track') || e.id::text));
  select count(*) + 1 into n from visitor_attempts
    where exam_id = e.id and grade_num = (s->>'grade_num')::int and track = s->>'track' and name_key = s->>'name_key';
  insert into visitor_attempts (exam_id, grade_num, track, name_key, visitor_name, attempt_number, score_gained, total_marks, percentage, passed, time_spent_seconds)
  values (e.id, (s->>'grade_num')::int, s->>'track', s->>'name_key', s->>'name', n, got, tot, pct, pct >= pass,
          greatest(0, least(coalesce((p->>'time_spent_seconds')::int, 0), 86400)))
  returning * into v;
  return jsonb_build_object('guest', true, 'id', v.id, 'exam_id', e.id, 'attempt_number', n, 'score_gained', got, 'total_marks', tot, 'percentage', pct,
    'passed', case when v.passed then 1 else 0 end,
    'key', (select jsonb_agg(jsonb_build_object('correct', (x->>'correct')::int, 'feedback', coalesce(x->>'feedback', '')) order by o)
            from jsonb_array_elements(e.questions) with ordinality t(x, o)));
end $$;

-- Login never raises (a raise would roll back the failed-attempt counter): errors come back as { error, message }.
create or replace function public.api_login(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  r text := p->>'role'; k text := (p->>'role') || ':' || _client_ip(); g login_guard; pin text; hash text; st students;
  v_data jsonb; tok text; nm text;
begin
  if coalesce(r, '') not in ('admin', 'teacher', 'student', 'guest') then return jsonb_build_object('error', 'bad_role'); end if;
  if r = 'guest' then   -- guest codes are not secret, so no lock-out; visitors save only into visitor_attempts (their name + class)
    if coalesce((select value from settings where key = 'guest_enabled'), 'true') <> 'true' then
      return jsonb_build_object('error', 'guest_disabled', 'message', 'Guest practice is switched off');
    end if;
    v_data := _guest_class(p->>'code');
    if v_data is null then return jsonb_build_object('error', 'bad_guest_code', 'message', 'Unknown guest code'); end if;
    nm := regexp_replace(trim(coalesce(p->>'name', '')), '\s+', ' ', 'g');
    if char_length(nm) < 2 or char_length(nm) > 40 or nm ~ '[<>]' then
      return jsonb_build_object('error', 'guest_name_required', 'message', 'Please type your name (2–40 letters)');
    end if;
    v_data := v_data || jsonb_build_object('name', nm, 'name_key', lower(nm));
    delete from sessions where expires_at < now();
    tok := encode(gen_random_bytes(32), 'hex');
    insert into sessions (token, role, data, expires_at) values (tok, 'guest', v_data, now() + interval '12 hours');
    insert into visitor_visits (grade_num, track, name_key) values ((v_data->>'grade_num')::int, v_data->>'track', v_data->>'name_key');
    return v_data || jsonb_build_object('role', 'guest', 'token', tok);
  end if;
  select * into g from login_guard where key = k;
  if g.locked_until is not null and g.locked_until > now() then
    return jsonb_build_object('error', 'locked', 'message', ceil(extract(epoch from g.locked_until - now()))::int::text);
  end if;
  if r in ('admin', 'teacher') then
    pin := _norm_id(p->>'pin');
    select value into hash from settings where key = r || '_pin_hash';
    if pin !~ '^\d{4}$' or hash is null or crypt(pin, hash) <> hash then
      insert into login_guard as lg (key, fails) values (k, 1)
        on conflict (key) do update set fails = lg.fails + 1;
      update login_guard set locked_until = now() + interval '60 seconds', fails = 0 where key = k and fails >= 5;
      return jsonb_build_object('error', 'bad_pin', 'message', 'Incorrect PIN');
    end if;
    if r = 'admin' then v_data := jsonb_build_object('name', 'Administrator');
    else
      nm := trim(coalesce(p->>'teacher_name', ''));
      if nm = '' then return jsonb_build_object('error', 'name_required'); end if;
      if exists (select 1 from teacher_assignments) and not exists (select 1 from teacher_assignments where teacher_name = nm) then
        return jsonb_build_object('error', 'unknown_teacher', 'message', 'Teacher name is not on the school teacher list');
      end if;
      v_data := jsonb_build_object('name', nm, 'grade', nullif(p->>'grade', '')::int, 'track', coalesce(nullif(p->>'track', ''), 'General'), 'subject', coalesce(p->>'subject', ''));
    end if;
  else
    select * into st from students where student_id = _norm_id(p->>'student_id');
    if st is null then
      insert into login_guard as lg (key, fails) values (k, 1)
        on conflict (key) do update set fails = lg.fails + 1;
      update login_guard set locked_until = now() + interval '60 seconds', fails = 0 where key = k and fails >= 5;
      return jsonb_build_object('error', 'unknown_student', 'message', 'Student ID not found');
    end if;
    v_data := to_jsonb(st);
  end if;
  delete from login_guard where key = k;
  delete from sessions where expires_at < now();
  tok := encode(gen_random_bytes(32), 'hex');
  insert into sessions (token, role, data, expires_at) values (tok, r, v_data, now() + interval '12 hours');
  return v_data || jsonb_build_object('role', r, 'token', tok);
end $$;

create or replace function public.api_me(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select data || jsonb_build_object('role', role) from sessions where token = p_token and expires_at > now()
$$;

create or replace function public.api_logout(p_token text) returns jsonb
language sql security definer set search_path = public as $$
  delete from sessions where token = p_token; select jsonb_build_object('ok', true)
$$;

create or replace function public.api_set_term(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform _sess(p_token, array['admin']);
  if p->>'active_term' not in ('Term 1', 'Term 2', 'Term 3') then perform _err('bad_term'); end if;
  update settings set value = p->>'active_term' where key = 'active_term';
  return jsonb_build_object('active_term', p->>'active_term');
end $$;

create or replace function public.api_change_pin(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare pin text := _norm_id(p->>'new_pin');
begin
  perform _sess(p_token, array['admin']);
  if p->>'kind' not in ('admin', 'teacher') or pin !~ '^\d{4}$' then perform _err('bad_pin_format', 'PIN must be exactly 4 digits'); end if;
  insert into settings (key, value) values ((p->>'kind') || '_pin_hash', crypt(pin, gen_salt('bf')))
    on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true);
end $$;

-- section list with counts only (no IDs) — used on the sign-in and upload pages
create or replace function public.api_sections() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.grade_num, x.track, x.section), '[]') from (
    select section, min(grade_num) grade_num, min(track) track, count(*) student_count from students group by section) x
$$;

create or replace function public.api_students(p_token text, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := _norm_id(p->>'q');
begin
  perform _sess(p_token, array['admin', 'teacher']);
  return coalesce((select jsonb_agg(to_jsonb(s) order by s.grade_num, s.section, s.student_id) from students s
    where (coalesce(p->>'grade', '') = '' or s.grade_num = (p->>'grade')::int)
      and (coalesce(p->>'track', '') in ('', 'ALL') or s.track = p->>'track')
      and (coalesce(p->>'section', '') in ('', 'ALL') or s.section = p->>'section')
      and (q = '' or s.student_id like '%' || q || '%')), '[]');
end $$;

-- replace the roster (parsed in the browser by roster-parser.js); attempts are kept
create or replace function public.api_import_roster(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; added int; removed int;
begin
  perform _sess(p_token, array['admin']);
  create temp table _new on commit drop as
    select distinct on (_norm_id(x->>'student_id')) _norm_id(x->>'student_id') student_id, (x->>'grade_num')::int grade_num,
           x->>'grade_label_en' grade_label_en, x->>'grade_label_ar' grade_label_ar, x->>'track' track, x->>'section' section
    from jsonb_array_elements(coalesce(p->'students', '[]')) x where _norm_id(x->>'student_id') <> '';
  select count(*) into n from _new;
  if n = 0 then perform _err('empty_roster', 'No Grade 5–12 students found in this file'); end if;
  select count(*) into added from _new w where not exists (select 1 from students s where s.student_id = w.student_id);
  select count(*) into removed from students s where not exists (select 1 from _new w where w.student_id = s.student_id);
  delete from students;
  insert into students select student_id, grade_num, grade_label_en, grade_label_ar, track, section from _new;
  return jsonb_build_object('students', n, 'sections', (select count(distinct section) from _new), 'added', added, 'removed', removed, 'notes', coalesce(p->'notes', '[]'));
end $$;

create or replace function public.api_exams(p_token text, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _sess(p_token, array['admin', 'teacher']);
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', e.id, 'title', e.title, 'subject', e.subject, 'grade_num', e.grade_num, 'track', e.track, 'term', e.term,
      'target_sections', e.target_sections, 'teacher_name', e.teacher_name, 'is_published', case when e.is_published then 1 else 0 end,
      'q_count', e.q_count, 'total_marks', e.total_marks, 'created_at', e.created_at, 'updated_at', e.updated_at,
      'duration_minutes', (e.config->>'durationMinutes')::numeric, 'calculator_allowed', coalesce((e.config->>'calculatorAllowed')::boolean, false),
      'passing_percent', coalesce((e.config->>'passingPercent')::numeric, 50),
      'unique_students', st.u, 'attempts_count', st.n, 'avg_best_pct', st.avg_pct,
      'class_total', (select count(*) from students s where s.grade_num = e.grade_num and (e.track = 'All' or s.track = e.track)
                        and (e.target_sections ? 'ALL' or e.target_sections ? s.section))) order by e.created_at desc)
    from exams e
    left join lateral (select count(*) u, coalesce(sum(c), 0) n, avg(pct) avg_pct
                       from (select count(*) c, max(percentage) pct from attempts a where a.exam_id = e.id group by a.student_id) b) st on true
    where (coalesce(p->>'term', '') in ('', 'ALL') or e.term = p->>'term')
      and (coalesce(p->>'grade', '') = '' or e.grade_num = (p->>'grade')::int)
      and (coalesce(p->>'track', '') in ('', 'ALL') or e.track = p->>'track')
      and _subj_match(e.subject, p->>'subject')
      and (coalesce(p->>'teacher', '') = '' or e.teacher_name ilike '%' || (p->>'teacher') || '%')
      and (coalesce(p->>'published', '') = '' or e.is_published = (p->>'published')::boolean)), '[]');
end $$;

-- full exam. Students: only published + visible + active term, and WITHOUT the answer key / worked solutions.
create or replace function public.api_exam(p_token text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s jsonb := _sess(p_token, array['admin', 'teacher', 'student', 'guest']); e exams; j jsonb;
begin
  select * into e from exams where id = p_id;
  if e is null then perform _err('not_found', 'Exam not found'); end if;
  j := to_jsonb(e) || jsonb_build_object('is_published', case when e.is_published then 1 else 0 end);
  if s->>'role' = 'guest' then
    if not _guest_visible(e, (s->>'grade_num')::int, s->>'track') then perform _err('forbidden', 'This exam is not available'); end if;
    j := jsonb_set(j, '{questions}', (select coalesce(jsonb_agg(q - 'correct' - 'feedback' order by i), '[]') from jsonb_array_elements(e.questions) with ordinality t(q, i)));
    j := j || jsonb_build_object('teacher_name', '');   -- teacher names are not shown to visitors
  elsif s->>'role' = 'student' then
    if not e.is_published or not _visible(e, (s->>'grade_num')::int, s->>'track', s->>'section')
       or e.term <> (select value from settings where key = 'active_term') then
      perform _err('forbidden', 'This exam is not available');
    end if;
    j := jsonb_set(j, '{questions}', (select coalesce(jsonb_agg(q - 'correct' - 'feedback' order by i), '[]') from jsonb_array_elements(e.questions) with ordinality t(q, i)));
  end if;
  return j;
end $$;

create or replace function public._check_questions(q jsonb) returns void language plpgsql immutable as $$
declare x jsonb; n int; c int; i int := 0;
begin
  if jsonb_typeof(q) <> 'array' or jsonb_array_length(q) = 0 then perform _err('invalid_exam', 'No questions'); end if;
  for x in select * from jsonb_array_elements(q) loop
    i := i + 1;
    n := jsonb_array_length(coalesce(x->'options', '[]'));
    c := (x->>'correct')::int;
    if n < 2 or n > 4 or c is null or c < 0 or c >= n or coalesce((x->>'marks')::numeric, 0) <= 0
       or (coalesce(x->>'en', '') = '' and coalesce(x->>'ar', '') = '') then
      perform _err('invalid_exam', 'Question ' || i || ' is incomplete (text, 2–4 options, correct answer, marks > 0).');
    end if;
  end loop;
end $$;

create or replace function public.api_create_exam(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g int := (p->>'grade_num')::int; tr text := coalesce(nullif(p->>'track', ''), 'General'); new_id uuid;
begin
  perform _sess(p_token, array['admin', 'teacher']);
  if coalesce(trim(p->>'title'), '') = '' or coalesce(p->>'subject', '') = '' or g is null or g not between 5 and 12 then
    perform _err('invalid_exam', 'Missing title, subject, grade or questions');
  end if;
  if not _taught(p->>'subject', g, tr) then perform _err('subject_not_taught', 'This subject is not taught in the selected grade/track'); end if;
  perform _check_questions(p->'questions');
  insert into exams (title, subject, grade_num, track, term, target_sections, teacher_name, config, passages, questions, is_published)
  values (trim(p->>'title'), p->>'subject', g, tr,
          case when p->>'term' in ('Term 1', 'Term 2', 'Term 3') then p->>'term' else 'Term 1' end,
          case when jsonb_array_length(coalesce(p->'target_sections', '[]')) > 0 then p->'target_sections' else '["ALL"]' end,
          coalesce(nullif(trim(p->>'teacher_name'), ''), 'Teacher'), coalesce(p->'config', '{}'), coalesce(p->'passages', '{}'),
          p->'questions', coalesce((p->>'is_published')::boolean, true))
  returning id into new_id;
  return jsonb_build_object('id', new_id);
end $$;

-- teachers may change / delete only the exams they uploaded; the administrator may change any exam
create or replace function public._check_owner(s jsonb, e public.exams) returns void language plpgsql as $$
begin
  if s->>'role' = 'teacher' and e.teacher_name is distinct from s->>'name' then
    perform _err('not_owner', 'Only the teacher who uploaded this exam (or the administrator) can change or delete it.');
  end if;
end $$;

create or replace function public.api_update_exam(p_token text, p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e exams; s jsonb := _sess(p_token, array['admin', 'teacher']);
begin
  select * into e from exams where id = p_id;
  if e is null then perform _err('not_found'); end if;
  perform _check_owner(s, e);
  if (p ? 'subject' or p ? 'grade_num' or p ? 'track') and not _taught(coalesce(p->>'subject', e.subject), coalesce((p->>'grade_num')::int, e.grade_num), coalesce(p->>'track', e.track)) then
    perform _err('subject_not_taught', 'This subject is not taught in the selected grade/track');
  end if;
  if p ? 'term' and p->>'term' not in ('Term 1', 'Term 2', 'Term 3') then perform _err('bad_term'); end if;
  update exams set
    title = coalesce(nullif(trim(p->>'title'), ''), title), subject = coalesce(p->>'subject', subject),
    grade_num = coalesce((p->>'grade_num')::int, grade_num), track = coalesce(p->>'track', track), term = coalesce(p->>'term', term),
    target_sections = case when jsonb_array_length(coalesce(p->'target_sections', '[]')) > 0 then p->'target_sections' else target_sections end,
    teacher_name = coalesce(nullif(trim(p->>'teacher_name'), ''), teacher_name),
    is_published = case when p ? 'is_published' then (p->>'is_published') in ('1', 'true') else is_published end,
    updated_at = now()
  where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_delete_exam(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e exams; s jsonb := _sess(p_token, array['admin', 'teacher']);
begin
  select * into e from exams where id = p_id;
  if e is null then perform _err('not_found', 'Exam not found'); end if;
  perform _check_owner(s, e);
  delete from exams where id = p_id;   -- attempts cascade
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_student_exams(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s jsonb := _sess(p_token, array['student', 'guest']); v_term text := (select value from settings where key = 'active_term');
  guest boolean := s->>'role' = 'guest';
begin
  return jsonb_build_object('active_term', v_term, 'exams', coalesce((
    select jsonb_agg(x order by x->>'subject', x->>'created_at' desc) from (
      select jsonb_build_object('id', e.id, 'title', e.title, 'subject', e.subject, 'teacher_name', case when guest then '' else e.teacher_name end, 'term', e.term,
        'q_count', e.q_count, 'total_marks', e.total_marks,
        'duration_minutes', (e.config->>'durationMinutes')::numeric, 'calculator_allowed', coalesce((e.config->>'calculatorAllowed')::boolean, false),
        'my_attempts', case when guest
            then (select count(*) from visitor_attempts v where v.exam_id = e.id and v.grade_num = (s->>'grade_num')::int and v.track = s->>'track' and v.name_key = s->>'name_key')
            else (select count(*) from attempts a where a.exam_id = e.id and a.student_id = s->>'student_id') end,
        'my_best_score', b.score_gained, 'my_best_pct', b.percentage, 'my_best_passed', b.passed, 'created_at', e.created_at) x
      from exams e
      left join lateral (select * from (
          select score_gained, percentage, passed, time_spent_seconds, submitted_at from attempts a
            where not guest and a.exam_id = e.id and a.student_id = s->>'student_id'
          union all
          select score_gained, percentage, passed, time_spent_seconds, submitted_at from visitor_attempts v
            where guest and v.exam_id = e.id and v.grade_num = (s->>'grade_num')::int and v.track = s->>'track' and v.name_key = s->>'name_key') z
        order by percentage desc, time_spent_seconds, submitted_at limit 1) b on true
      where e.grade_num = (s->>'grade_num')::int and (e.track = 'All' or e.track = s->>'track') and e.is_published and e.term = v_term
        and case when guest then true
                 else (e.target_sections ? 'ALL' or e.target_sections ? (s->>'section')) end) y), '[]'));
end $$;

create or replace function public.api_my_attempts(p_token text, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s jsonb := _sess(p_token, array['student', 'guest']);
begin
  if s->>'role' = 'guest' then   -- a visitor's own history (name + class code)
    return coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'exam_id', v.exam_id, 'attempt_number', v.attempt_number,
        'score_gained', v.score_gained, 'total_marks', v.total_marks, 'percentage', v.percentage, 'passed', case when v.passed then 1 else 0 end,
        'time_spent_seconds', v.time_spent_seconds, 'submitted_at', v.submitted_at, 'exam_title', e.title, 'subject', e.subject, 'term', e.term) order by v.submitted_at desc)
      from visitor_attempts v join exams e on e.id = v.exam_id
      where v.grade_num = (s->>'grade_num')::int and v.track = s->>'track' and v.name_key = s->>'name_key'
        and (coalesce(p->>'term', '') in ('', 'ALL') or e.term = p->>'term')), '[]');
  end if;
  return coalesce((select jsonb_agg(_attempt_row(a) order by a.submitted_at desc) from attempts a join exams e on e.id = a.exam_id
    where a.student_id = s->>'student_id' and (coalesce(p->>'term', '') in ('', 'ALL') or e.term = p->>'term')), '[]');
end $$;

-- scores on the server from the stored key; returns the saved attempt + the key so the student can review
create or replace function public.api_submit_attempt(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s jsonb := _sess(p_token, array['student']); e exams; got numeric := 0; tot numeric; pct numeric; n int; a attempts;
  q jsonb; i int; ans jsonb; pass numeric;
begin
  select * into e from exams where id = (p->>'exam_id')::uuid;
  if e is null then perform _err('not_found', 'Exam not found'); end if;
  if not e.is_published or not _visible(e, (s->>'grade_num')::int, s->>'track', s->>'section')
     or e.term <> (select value from settings where key = 'active_term') then perform _err('forbidden', 'This exam is not available'); end if;
  for q, i in select x, (o - 1)::int from jsonb_array_elements(e.questions) with ordinality t(x, o) loop
    ans := p->'answers'->(i::text);
    if ans is not null and jsonb_typeof(ans->'picked') = 'number' and (ans->>'picked')::int = (q->>'correct')::int then
      got := got + coalesce((q->>'marks')::numeric, 0);
    end if;
  end loop;
  tot := _total(e.questions);
  pct := case when tot > 0 then round(got / tot * 100, 2) else 0 end;
  pass := coalesce((e.config->>'passingPercent')::numeric, 50);
  perform pg_advisory_xact_lock(hashtext((s->>'student_id') || e.id::text));
  select count(*) + 1 into n from attempts where student_id = s->>'student_id' and exam_id = e.id;
  insert into attempts (exam_id, student_id, grade_num, track, section, attempt_number, score_gained, total_marks, percentage, passed, time_spent_seconds, answers)
  values (e.id, s->>'student_id', (s->>'grade_num')::int, s->>'track', s->>'section', n, got, tot, pct, pct >= pass,
          greatest(0, least(coalesce((p->>'time_spent_seconds')::int, 0), 86400)), coalesce(p->'answers', '{}'))
  returning * into a;
  return _attempt_row(a) || jsonb_build_object('key',
    (select jsonb_agg(jsonb_build_object('correct', (x->>'correct')::int, 'feedback', coalesce(x->>'feedback', '')) order by o)
     from jsonb_array_elements(e.questions) with ordinality t(x, o)));
end $$;

create or replace function public.api_attempts(p_token text, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare sid text := _norm_id(p->>'student_id');
begin
  perform _sess(p_token, array['admin', 'teacher']);
  return coalesce((select jsonb_agg(_attempt_row(a)) from attempts a join exams e on e.id = a.exam_id
    where (coalesce(p->>'term', '') in ('', 'ALL') or e.term = p->>'term')
      and (coalesce(p->>'grade', '') = '' or a.grade_num = (p->>'grade')::int)
      and (coalesce(p->>'track', '') in ('', 'ALL') or a.track = p->>'track')
      and (coalesce(p->>'section', '') in ('', 'ALL') or a.section = p->>'section')
      and _subj_match(e.subject, p->>'subject')
      and (coalesce(p->>'exam_id', '') in ('', 'ALL') or a.exam_id::text = p->>'exam_id')
      and (sid = '' or a.student_id like '%' || sid || '%')), '[]');
end $$;

create or replace function public.api_attempt(p_token text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s jsonb := _sess(p_token, array['admin', 'teacher', 'student']); a attempts;
begin
  select * into a from attempts where id = p_id;
  if a is null or (s->>'role' = 'student' and a.student_id <> s->>'student_id') then perform _err('not_found'); end if;
  return _attempt_row(a, true);
end $$;

create or replace function public.api_item_stats(p_token text, p_id uuid, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e exams;
begin
  perform _sess(p_token, array['admin', 'teacher']);
  select * into e from exams where id = p_id;
  if e is null then perform _err('not_found'); end if;
  return (
    with at as (select answers from attempts a where a.exam_id = p_id
                  and (coalesce(p->>'track', '') in ('', 'ALL') or a.track = p->>'track')
                  and (coalesce(p->>'section', '') in ('', 'ALL') or a.section = p->>'section')),
    qs as (select (o - 1)::int i, x q from jsonb_array_elements(e.questions) with ordinality t(x, o))
    select coalesce(jsonb_agg(jsonb_build_object(
      'index', qs.i, 'q_num', coalesce((qs.q->>'q_num')::int, qs.i + 1), 'section_part', coalesce(qs.q->>'section_part', ''), 'topic', coalesce(qs.q->>'topic', ''),
      'text', coalesce(nullif(qs.q->>'en', ''), qs.q->>'ar', ''), 'correct_option', (qs.q->>'correct')::int,
      'attempts', (select count(*) from at),
      'answered', (select count(*) from at where jsonb_typeof(at.answers->(qs.i::text)->'picked') = 'number'),
      'correct', (select count(*) from at where (at.answers->(qs.i::text)->>'picked')::int = (qs.q->>'correct')::int),
      'correct_rate', (select case when count(*) > 0 then count(*) filter (where (at.answers->(qs.i::text)->>'picked')::int = (qs.q->>'correct')::int) * 100.0 / count(*) end from at),
      'picks', (select jsonb_agg((select count(*) from at where (at.answers->(qs.i::text)->>'picked')::int = k.k) order by k.k)
                from generate_series(0, jsonb_array_length(qs.q->'options') - 1) k(k))
    ) order by qs.i), '[]') from qs);
end $$;

create or replace function public.api_report_data(p_token text, p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform _sess(p_token, array['admin']);
  return jsonb_build_object('term', coalesce(p->>'term', 'ALL'),
    'students', coalesce((select jsonb_agg(to_jsonb(s)) from students s), '[]'),
    'exams', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'subject', e.subject, 'grade_num', e.grade_num, 'track', e.track,
              'term', e.term, 'target_sections', e.target_sections, 'teacher_name', e.teacher_name, 'is_published', case when e.is_published then 1 else 0 end,
              'total_marks', e.total_marks, 'created_at', e.created_at)) from exams e), '[]'),
    'attempts', coalesce((select jsonb_agg((to_jsonb(a) - 'answers' - 'passed') || jsonb_build_object('passed', case when a.passed then 1 else 0 end)) from attempts a), '[]'));
end $$;

-- ------------------------------------------------------------------ permissions: only the api_* functions are callable
do $$ declare f record; begin
  for f in select p.oid::regprocedure sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname like 'api\_%' or p.proname like '\_%') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname like 'api\_%' then execute format('grant execute on function %s to anon, authenticated', f.sig); end if;
  end loop;
end $$;
