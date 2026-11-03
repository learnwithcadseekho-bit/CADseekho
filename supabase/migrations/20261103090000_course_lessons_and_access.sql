-- Recorded lessons, per-module downloads, free preview modules and course
-- bundles — first used by "SOLIDWORKS Simulation for Industry Professionals"
-- (seeded in 20261103090200_sw_simulation_seed.sql).
--
-- Access rule (module_access below is the single place it lives):
--   * free module (is_free)   → any signed-in user
--   * paid module             → enrolled in the course (course_registrations.status = 'enrolled')
--   * admin                   → everything, including unreleased/unpublished
--   * signed out              → nothing (they still see titles and durations)
-- A module must also be released (is_released) and its course published.
--
-- Videos: Bunny Stream video ids live in course_lesson_videos, which only
-- admins can read. The lesson-play-url Edge Function checks module_access,
-- then hands back a short-lived *signed* Bunny embed URL — the browser never
-- sees an unsigned video URL or a bare video id outside that signed URL.
--
-- Downloads: private bucket "course-files", read through storage RLS calling
-- the same access rule. Test/answer files (*_Test*, *_Solved*) are refused at
-- both the table and the storage layer.

-- ---------------------------------------------------------------------------
-- 0. Security fix: a signed-in user could insert their own registration with
--    status 'enrolled' (the old policy only checked user_id) and enroll for
--    free. The site never sends a status, so new rows must be 'registered';
--    only mark_payment_paid (service role) and admins set 'enrolled'.

drop policy "course_registrations_insert_own" on public.course_registrations;
create policy "course_registrations_insert_own"
  on public.course_registrations for insert
  with check (user_id = auth.uid() and status = 'registered');

-- ---------------------------------------------------------------------------
-- 1. Modules: code, hours, free preview, release state.

alter table public.course_modules
  -- Short syllabus code, e.g. 'L1-M1'. Unique within a course when set.
  add column code text,
  add column hours numeric(4, 1) check (hours is null or hours > 0),
  add column is_free boolean not null default false,
  -- Unreleased modules stay in the syllabus as "Coming soon"; their lessons can't be played.
  add column is_released boolean not null default true,
  -- Optional, shown next to "Coming soon", e.g. 'Week of 24 Nov'.
  add column release_label text;

create unique index course_modules_course_code_key on public.course_modules (course_id, code) where code is not null;

-- ---------------------------------------------------------------------------
-- 2. Bundles: a course row that, when bought, also enrolls into these courses
--    (the SOLIDWORKS Simulation Combo = Level 1 + Level 2). Bundles are
--    left out of the public course listings.

alter table public.courses add column bundle_course_ids uuid[];

-- ---------------------------------------------------------------------------
-- 3. Lessons

create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  -- e.g. 'M1.2', 'M1-QUIZ'. Unique within the module.
  code text not null check (char_length(code) between 1 and 20),
  title text not null,
  kind text not null default 'video' check (kind in ('video', 'quiz', 'problems', 'test')),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  order_number integer not null,
  -- Off until the video is uploaded and its id pasted in the admin.
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, code),
  unique (module_id, order_number)
);

create index course_lessons_module_id_idx on public.course_lessons (module_id);

create trigger set_course_lessons_updated_at
  before update on public.course_lessons
  for each row execute function public.set_updated_at();

alter table public.course_lessons enable row level security;

-- Titles/durations are public wherever the course is (the syllabus shows them).
create policy "course_lessons_select_published_course_or_admin"
  on public.course_lessons for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_lessons.module_id and c.is_published
    )
  );

create policy "course_lessons_admin_write"
  on public.course_lessons for all
  using (public.is_admin())
  with check (public.is_admin());

-- Bunny video ids: admin-only. The Edge Function reads them with the service role.
create table public.course_lesson_videos (
  lesson_id uuid primary key references public.course_lessons (id) on delete cascade,
  -- Bunny Stream video GUID.
  bunny_video_id text not null check (bunny_video_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  updated_at timestamptz not null default now()
);

create trigger set_course_lesson_videos_updated_at
  before update on public.course_lesson_videos
  for each row execute function public.set_updated_at();

alter table public.course_lesson_videos enable row level security;

create policy "course_lesson_videos_admin_all"
  on public.course_lesson_videos for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Per-module downloads (part files, slide PDFs, templates)

create table public.course_files (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  -- Object name inside the "course-files" bucket, e.g. '<module id>/L1M1_Start_Files.zip'.
  storage_path text not null unique,
  order_number integer not null default 0,
  created_at timestamptz not null default now(),
  -- Never publish tests or worked answers.
  constraint course_files_no_answer_files check (storage_path !~* '_(test|solved)')
);

create index course_files_module_id_idx on public.course_files (module_id);

alter table public.course_files enable row level security;

-- The list is public (so people see what they'd get); the files themselves are gated in storage.
create policy "course_files_select_published_course_or_admin"
  on public.course_files for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = course_files.module_id and c.is_published
    )
  );

create policy "course_files_admin_write"
  on public.course_files for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. The access rule

-- For a given user (null = signed out). Service role / definer use only.
create or replace function public.module_access(p_module_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_user_id is not null and (
    exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
    or exists (
      select 1
      from public.course_modules m
      join public.courses c on c.id = m.course_id
      where m.id = p_module_id
        and c.is_published
        and m.is_released
        and (
          m.is_free
          or exists (
            select 1 from public.course_registrations r
            where r.course_id = m.course_id and r.user_id = p_user_id and r.status = 'enrolled'
          )
        )
    )
  );
$$;

revoke all on function public.module_access(uuid, uuid) from public, anon, authenticated;

-- For the caller (RLS, and the site's "can I open this?" check).
create or replace function public.can_access_module(p_module_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.module_access(p_module_id, auth.uid());
$$;

grant execute on function public.can_access_module(uuid) to anon, authenticated;

create or replace function public.can_access_course_file(p_storage_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select public.module_access(f.module_id, auth.uid()) from public.course_files f where f.storage_path = p_storage_path),
    false
  );
$$;

grant execute on function public.can_access_course_file(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Storage: private bucket for course downloads. 50 MB per file.

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-files', 'course-files', false, 52428800)
on conflict (id) do nothing;

create policy "course_files_bucket_read_with_access"
  on storage.objects for select
  using (bucket_id = 'course-files' and public.can_access_course_file(name));

create policy "course_files_bucket_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'course-files' and public.is_admin() and name !~* '_(test|solved)');

create policy "course_files_bucket_admin_update"
  on storage.objects for update
  using (bucket_id = 'course-files' and public.is_admin())
  with check (bucket_id = 'course-files' and public.is_admin() and name !~* '_(test|solved)');

create policy "course_files_bucket_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'course-files' and public.is_admin());

-- Admins see every object in the bucket (the select policy above only covers listed files).
create policy "course_files_bucket_admin_select"
  on storage.objects for select
  using (bucket_id = 'course-files' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. mark_payment_paid: also enroll into a bundle's courses. Same as
--    20260922090000_razorpay_payments.sql otherwise.

create or replace function public.mark_payment_paid(
  p_order_id text,
  p_payment_id text,
  p_amount integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
begin
  select * into v_payment
  from public.payments
  where razorpay_order_id = p_order_id
  for update;

  if not found then
    return 'unknown_order';
  end if;

  if v_payment.status = 'paid' then
    return 'already_paid';
  end if;

  if p_amount is not null and p_amount <> v_payment.amount then
    return 'amount_mismatch';
  end if;

  update public.payments
  set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
  where id = v_payment.id;

  insert into public.course_registrations (user_id, course_id, status)
  values (v_payment.user_id, v_payment.course_id, 'enrolled')
  on conflict (user_id, course_id) do update set status = 'enrolled';

  -- Bundle (e.g. Combo): enroll into each included course too.
  insert into public.course_registrations (user_id, course_id, status)
  select v_payment.user_id, b.course_id, 'enrolled'
  from public.courses c
  cross join lateral unnest(c.bundle_course_ids) as b(course_id)
  where c.id = v_payment.course_id
  on conflict (user_id, course_id) do update set status = 'enrolled';

  return 'paid';
end;
$$;

revoke all on function public.mark_payment_paid(text, text, integer) from public, anon, authenticated;
