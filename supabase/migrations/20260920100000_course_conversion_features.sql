-- Conversion-page gaps: a real schedule for "Live, Instructor-Led" courses,
-- a genuine registration count (no PII exposure — course_registrations
-- itself stays locked down to the registrant/admin per existing RLS), and
-- an admin-manageable FAQ list per course.

alter table public.courses
  add column next_batch_date date,
  add column registration_count integer not null default 0;

-- Live batches all start 2 Oct 2026 per current schedule.
update public.courses set next_batch_date = '2026-10-02' where format = 'live';

-- Backfill from any registrations that already exist.
update public.courses c
set registration_count = (
  select count(*) from public.course_registrations r where r.course_id = c.id
);

-- Same pattern as increment_download_count/download_logs: keep a counter in
-- sync via trigger so the public course page can show a real number without
-- querying (or exposing) individual registration rows.
create or replace function public.increment_course_registration_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.courses
  set registration_count = registration_count + 1
  where id = new.course_id;
  return new;
end;
$$;

create trigger on_course_registration_created
  after insert on public.course_registrations
  for each row execute function public.increment_course_registration_count();

create table public.course_faqs (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  question text not null,
  answer text not null,
  order_number int not null,
  unique (course_id, order_number)
);

create index course_faqs_course_id_idx on public.course_faqs (course_id);

alter table public.course_faqs enable row level security;

-- Same visibility rule as course_modules/course_skills.
create policy "course_faqs_select_published_or_admin"
  on public.course_faqs for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_faqs.course_id and c.is_published = true
    )
  );

create policy "course_faqs_admin_insert"
  on public.course_faqs for insert
  with check (public.is_admin());

create policy "course_faqs_admin_update"
  on public.course_faqs for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "course_faqs_admin_delete"
  on public.course_faqs for delete
  using (public.is_admin());
