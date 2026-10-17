-- Study Practice v2: linked accounts for a parent and his child.
--
-- Paste this whole file into the Supabase SQL editor and press Run (docs/SETUP-SUPABASE.md).
-- It is safe to run once on a new project. It creates:
--   profiles  one row per account: role parent or student; a student points to her parent
--   sessions  one row per finished practice session (the app's own record is kept in `data`)
--   attempts  one row per question in a finished session, with her working (strokes + image path)
--   reports   the parent report made after each session
--   ask_log   (Step B) questions the parent asked about her progress, and Claude's answers
--
-- Security model (Row Level Security on every table):
--   * a student reads and writes only her own rows;
--   * a parent reads the rows of a child linked to him (profiles.parent_id), and writes nothing;
--   * anonymous visitors see nothing at all;
--   * nobody can delete through the app; accounts and profiles are created only by the
--     manage-student edge function (service role) and by the make_parent() function below,
--     which can be run only from the SQL editor.
-- The review checklist for these policies is docs/rls-review-checklist.md.

-- ------------------------------------------------------------------ profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('parent', 'student')),
  parent_id uuid references public.profiles (id) on delete restrict,
  username text unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  display_name text check (char_length(display_name) <= 40),
  created_at timestamptz not null default now(),
  -- a parent has no parent; a student always has one, and a username to sign in with
  constraint profiles_role_shape check (
    (role = 'parent' and parent_id is null)
    or (role = 'student' and parent_id is not null and username is not null)
  ),
  constraint profiles_not_own_parent check (parent_id is null or parent_id <> id)
);

create index profiles_parent_idx on public.profiles (parent_id);

-- ------------------------------------------------------------------ helper functions
-- SECURITY DEFINER so that policies can look at profiles without recursing into the profiles
-- policy; each one has a fixed, empty search_path and fully qualified names.

create function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'student'
  );
$$;

create function public.is_parent_of(student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = student and p.role = 'student' and p.parent_id = (select auth.uid())
  );
$$;

-- for storage paths: the first folder of a working image is the student's id, as text
create function public.can_read_student_folder(folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select folder = (select auth.uid())::text
    or exists (
      select 1 from public.profiles p
      where p.id::text = folder and p.role = 'student' and p.parent_id = (select auth.uid())
    );
$$;

revoke execute on function public.is_student() from public, anon;
revoke execute on function public.is_parent_of(uuid) from public, anon;
revoke execute on function public.can_read_student_folder(text) from public, anon;
grant execute on function public.is_student() to authenticated;
grant execute on function public.is_parent_of(uuid) to authenticated;
grant execute on function public.can_read_student_folder(text) to authenticated;

-- ------------------------------------------------------------------ sessions

create table public.sessions (
  id text primary key check (char_length(id) between 1 and 100),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('maths', 'science')),
  topic_id text check (char_length(topic_id) <= 100),
  mode text check (mode in ('topic', 'subtopic', 'weak', 'mixed')),
  started_at timestamptz not null,
  ended_at timestamptz,
  score_pct real check (score_pct between 0 and 1),
  questions integer check (questions between 0 and 1000),
  data jsonb not null check (octet_length(data::text) < 1000000),
  synced_at timestamptz not null default now(),
  -- lets attempts and reports prove they belong to the same student as their session
  constraint sessions_id_student_key unique (id, student_id)
);

create index sessions_student_started_idx on public.sessions (student_id, started_at desc);

-- ------------------------------------------------------------------ attempts

create table public.attempts (
  id text primary key check (char_length(id) between 1 and 250),
  session_id text not null,
  student_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null check (char_length(question_id) <= 120),
  correct boolean not null,
  answered_at timestamptz not null,
  data jsonb not null check (octet_length(data::text) < 200000),
  -- her working: vector strokes (compact JSON) and the storage path of a small PNG
  working_strokes jsonb check (working_strokes is null or octet_length(working_strokes::text) < 400000),
  working_path text check (
    working_path is null
    or (split_part(working_path, '/', 1) = student_id::text and char_length(working_path) <= 300)
  ),
  constraint attempts_session_fk foreign key (session_id, student_id)
    references public.sessions (id, student_id) on delete cascade
);

create index attempts_student_idx on public.attempts (student_id, answered_at);
create index attempts_session_idx on public.attempts (session_id);

-- ------------------------------------------------------------------ reports

create table public.reports (
  session_id text primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  data jsonb not null check (octet_length(data::text) < 500000),
  constraint reports_session_fk foreign key (session_id, student_id)
    references public.sessions (id, student_id) on delete cascade
);

create index reports_student_idx on public.reports (student_id, created_at desc);

-- ------------------------------------------------------------------ ask_log (Step B)
-- Written only by the ask-progress edge function (service role). The parent can read his own.

create table public.ask_log (
  id bigint generated always as identity primary key,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  question text not null check (char_length(question) <= 2000),
  answer text check (char_length(answer) <= 20000),
  model text check (char_length(model) <= 100),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index ask_log_parent_idx on public.ask_log (parent_id, created_at desc);

-- ------------------------------------------------------------------ Row Level Security

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.reports enable row level security;
alter table public.ask_log enable row level security;

-- profiles: you see yourself; a parent also sees his children. No writes from the app.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or parent_id = (select auth.uid()));

-- sessions, attempts, reports: the student owns them; her parent may read them.
create policy sessions_select on public.sessions
  for select to authenticated
  using (student_id = (select auth.uid()) or public.is_parent_of(student_id));
create policy sessions_insert on public.sessions
  for insert to authenticated
  with check (student_id = (select auth.uid()) and public.is_student());
create policy sessions_update on public.sessions
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()) and public.is_student());

create policy attempts_select on public.attempts
  for select to authenticated
  using (student_id = (select auth.uid()) or public.is_parent_of(student_id));
create policy attempts_insert on public.attempts
  for insert to authenticated
  with check (student_id = (select auth.uid()) and public.is_student());
create policy attempts_update on public.attempts
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()) and public.is_student());

create policy reports_select on public.reports
  for select to authenticated
  using (student_id = (select auth.uid()) or public.is_parent_of(student_id));
create policy reports_insert on public.reports
  for insert to authenticated
  with check (student_id = (select auth.uid()) and public.is_student());
create policy reports_update on public.reports
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()) and public.is_student());

-- ask_log: the parent reads his own questions and answers; only the edge function writes.
create policy ask_log_select on public.ask_log
  for select to authenticated
  using (parent_id = (select auth.uid()));

-- ------------------------------------------------------------------ table privileges
-- Supabase grants every new table to anon and authenticated by default. Narrow that down, so
-- even a policy mistake could not let a visitor in or let anyone delete.

revoke all on table public.profiles, public.sessions, public.attempts, public.reports, public.ask_log from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update on table public.sessions, public.attempts, public.reports to authenticated;
grant select on table public.ask_log to authenticated;

-- ------------------------------------------------------------------ make_parent()
-- Run once from the SQL editor after creating the parent's user (docs/SETUP-SUPABASE.md, step 6):
--   select public.make_parent('the parent''s email address');
-- Nobody can call it from the app.

create function public.make_parent(p_email text, p_display_name text default 'Parent')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  select u.id into uid from auth.users u where lower(u.email) = lower(trim(p_email));
  if uid is null then
    raise exception 'No user has that email address. First add the user under Authentication, Users, Add user.';
  end if;
  if exists (select 1 from public.profiles p where p.id = uid and p.role = 'student') then
    raise exception 'That account is a student account and cannot be made a parent.';
  end if;
  insert into public.profiles (id, role, display_name)
  values (uid, 'parent', left(p_display_name, 40))
  on conflict (id) do update set display_name = excluded.display_name;
  return uid;
end;
$$;

revoke execute on function public.make_parent(text, text) from public, anon, authenticated;
