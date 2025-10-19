create extension if not exists ""pgcrypto"";

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  first_name text not null,
  last_name text not null,
  grade_level int2,
  strand text,
  parent_email text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.attendance (
  id bigserial primary key,
  student_id text not null references public.students(student_id) on delete cascade,
  date date not null,
  time_in timestamptz,
  time_out timestamptz,
  status text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.students enable row level security;
alter table public.attendance enable row level security;

create policy if not exists ""Allow anonymous select on students""
on public.students for select
using (true);

create policy if not exists ""Allow anonymous insert on students""
on public.students for insert
with check (true);

create policy if not exists ""Allow anonymous select on attendance""
on public.attendance for select
using (true);

create policy if not exists ""Allow anonymous insert on attendance""
on public.attendance for insert
with check (true);
