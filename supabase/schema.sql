-- ============================================================
-- Sight Words App — full schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- users mirrors auth.users; row inserted by a trigger on signup
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  role        text not null check (role in ('admin', 'parent')),
  retired_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table public.students (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid not null references public.users(id) on delete cascade,
  display_name  text not null,
  grade_level   text,   -- 'K','1','2','3','4','5','6'
  retired_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,   -- 'sight_words'; future types added here
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Seed the one activity type we need
insert into public.activities (type, name) values ('sight_words', 'Sight Words');

create table public.sight_word_lists (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null references public.activities(id),
  grade_level  text not null,
  name         text not null,
  retired_at   timestamptz,
  created_at   timestamptz not null default now()
);

create table public.sight_words (
  id             uuid primary key default gen_random_uuid(),
  list_id        uuid not null references public.sight_word_lists(id) on delete cascade,
  word           text not null,
  image_url      text,    -- Supabase Storage path (null = word-only display)
  display_order  int,
  retired_at     timestamptz,
  created_at     timestamptz not null default now()
);

create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  list_id     uuid not null references public.sight_word_lists(id),
  input_mode  text not null check (input_mode in ('handwrite', 'type')),
  created_at  timestamptz not null default now(),
  unique (student_id, list_id)
);

create table public.progress_events (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id) on delete cascade,
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  word_id        uuid not null references public.sight_words(id),
  correct        boolean not null,
  self_reported  boolean not null default false,
  created_at     timestamptz not null default now()
);

-- No UNIQUE constraint — students may redo a completed list
create table public.list_completions (
  id                     uuid primary key default gen_random_uuid(),
  student_id             uuid not null references public.students(id) on delete cascade,
  list_id                uuid not null references public.sight_word_lists(id),
  assignment_id          uuid not null references public.assignments(id),
  completed_at           timestamptz not null default now(),
  practice_rounds_needed int not null default 0
);

-- ============================================================
-- TRIGGER: auto-insert a users row when auth.users is created
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'parent')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users             enable row level security;
alter table public.students          enable row level security;
alter table public.activities        enable row level security;
alter table public.sight_word_lists  enable row level security;
alter table public.sight_words       enable row level security;
alter table public.assignments       enable row level security;
alter table public.progress_events   enable row level security;
alter table public.list_completions  enable row level security;

-- Helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: ids of students the caller (parent) owns
create or replace function public.my_student_ids()
returns setof uuid language sql security definer set search_path = public
as $$
  select id from public.students where parent_id = auth.uid();
$$;

-- users
create policy "admin full access" on public.users for all using (public.is_admin());
create policy "parent read own row" on public.users for select using (id = auth.uid());

-- students
create policy "admin full access" on public.students for all using (public.is_admin());
create policy "parent read own students" on public.students for select using (parent_id = auth.uid());

-- activities (read-only for parents)
create policy "admin full access" on public.activities for all using (public.is_admin());
create policy "parent read" on public.activities for select using (true);

-- sight_word_lists (read-only for parents)
create policy "admin full access" on public.sight_word_lists for all using (public.is_admin());
create policy "parent read" on public.sight_word_lists for select using (true);

-- sight_words (read-only for parents)
create policy "admin full access" on public.sight_words for all using (public.is_admin());
create policy "parent read" on public.sight_words for select using (true);

-- assignments (read-only for parents, scoped to their students)
create policy "admin full access" on public.assignments for all using (public.is_admin());
create policy "parent read own" on public.assignments for select
  using (student_id in (select public.my_student_ids()));

-- progress_events (parents read/write for their students)
create policy "admin full access" on public.progress_events for all using (public.is_admin());
create policy "parent read own" on public.progress_events for select
  using (student_id in (select public.my_student_ids()));
create policy "parent insert own" on public.progress_events for insert
  with check (student_id in (select public.my_student_ids()));

-- list_completions (parents read/write for their students)
create policy "admin full access" on public.list_completions for all using (public.is_admin());
create policy "parent read own" on public.list_completions for select
  using (student_id in (select public.my_student_ids()));
create policy "parent insert own" on public.list_completions for insert
  with check (student_id in (select public.my_student_ids()));

-- ============================================================
-- STORAGE BUCKET for word images
-- Run these separately in the Supabase dashboard Storage section,
-- OR uncomment if using the Supabase CLI with storage management.
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('word-images', 'word-images', true);
-- create policy "public read" on storage.objects for select using (bucket_id = 'word-images');
-- create policy "admin upload" on storage.objects for insert using (public.is_admin() and bucket_id = 'word-images');
-- create policy "admin delete" on storage.objects for delete using (public.is_admin() and bucket_id = 'word-images');
