create extension if not exists "pgcrypto";

create table if not exists public.students (
  student_id text primary key,
  first_name text not null,
  last_name text not null,
  strand text,
  grade_level text,
  parent_email text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students(student_id) on delete cascade,
  date date not null,
  status text,
  time_in timestamptz,
  time_out timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_attendance_updated_at on public.attendance;
create trigger set_attendance_updated_at
before update on public.attendance
for each row
execute function public.set_updated_at();

alter table public.students enable row level security;
alter table public.attendance enable row level security;

create policy if not exists "Allow anonymous select on students"
on public.students for select
using (true);

create policy if not exists "Allow anonymous insert on students"
on public.students for insert
with check (true);

create policy if not exists "Allow anonymous select on attendance"
on public.attendance for select
using (true);

create policy if not exists "Allow anonymous insert on attendance"
on public.attendance for insert
with check (true);
