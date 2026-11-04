-- Recorded-course player: access expiry, Bunny encoding status, watch
-- progress, and the read functions behind "My Learning" and the
-- /learn/:course/:lesson player. Builds on 20261103090000_course_lessons_and_access.sql.
--
-- The access rule still lives in one place, public.module_access. This adds
-- the expiry check to it, and public.lesson_access on top (published lesson
-- in an accessible module). Everything else — the play URL, progress saving,
-- downloads, the lock icons in course_outline — calls those two.

-- ---------------------------------------------------------------------------
-- 1. How long a purchase lasts. null = lifetime.

alter table public.courses
  add column access_days integer check (access_days is null or access_days > 0);

-- SOLIDWORKS Simulation: 2 years (Level 1, Level 2 and the Combo).
update public.courses
set access_days = 730
where slug in ('solidworks-simulation', 'solidworks-simulation-level-2', 'solidworks-simulation-combo');

-- ---------------------------------------------------------------------------
-- 2. Enrollment expiry and where it came from.
--    A revoked enrollment is status 'cancelled' (already in the check).

alter table public.course_registrations
  add column enrolled_at timestamptz,
  add column expires_at timestamptz,
  add column source text check (source is null or source in ('razorpay', 'bundle', 'admin'));

create index course_registrations_user_status_idx on public.course_registrations (user_id, status);

-- Existing enrollments in a course with an access period: the period starts now.
update public.course_registrations r
set enrolled_at = coalesce(r.enrolled_at, now()),
    expires_at = now() + make_interval(days => c.access_days)
from public.courses c
where c.id = r.course_id and r.status = 'enrolled' and c.access_days is not null and r.expires_at is null;

-- Becoming 'enrolled' by any route (payment, admin, bundle) starts the access
-- period, unless the writer set expires_at itself (mark_payment_paid does,
-- for renewals). Admins can later clear expires_at for lifetime access.
create or replace function public.set_enrollment_period()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_days integer;
begin
  if new.status = 'enrolled' and (tg_op = 'INSERT' or old.status is distinct from 'enrolled') then
    new.enrolled_at := coalesce(new.enrolled_at, now());
    if new.expires_at is null then
      select access_days into v_days from public.courses where id = new.course_id;
      if v_days is not null then
        new.expires_at := now() + make_interval(days => v_days);
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger set_course_registrations_enrollment_period
  before insert or update of status on public.course_registrations
  for each row execute function public.set_enrollment_period();

-- ---------------------------------------------------------------------------
-- 3. Bunny encoding state per video, kept up to date by the "Fetch from
--    Bunny" admin button and the bunny-webhook Edge Function.

alter table public.course_lesson_videos
  add column duration_sec integer check (duration_sec is null or duration_sec >= 0),
  add column encode_status text not null default 'none'
    check (encode_status in ('none', 'processing', 'ready', 'failed')),
  -- When the status last changed; older webhook deliveries are ignored.
  add column encode_updated_at timestamptz,
  -- Optional: a different Bunny library than BUNNY_STREAM_LIBRARY_ID (e.g. a separate free library).
  add column library_id text check (library_id is null or library_id ~ '^[0-9]{1,12}$');

-- Videos saved before this migration were already playing.
update public.course_lesson_videos set encode_status = 'ready', encode_updated_at = now();

create index course_lesson_videos_bunny_video_id_idx on public.course_lesson_videos (bunny_video_id);

-- ---------------------------------------------------------------------------
-- 4. Lesson text and file kinds.

alter table public.course_lessons add column description text;

-- 'problems' files show under the player's Problems tab, the rest under Resources.
alter table public.course_files
  add column kind text not null default 'resource' check (kind in ('resource', 'problems'));

-- ---------------------------------------------------------------------------
-- 5. Watch progress. Written only through save_lesson_progress.

create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.course_lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  position_sec integer not null default 0 check (position_sec >= 0),
  watched_sec integer not null default 0 check (watched_sec >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_user_course_idx on public.lesson_progress (user_id, course_id, updated_at desc);

alter table public.lesson_progress enable row level security;

create policy "lesson_progress_select_own_or_admin"
  on public.lesson_progress for select
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. The access rule, now with expiry. Same as before otherwise.

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
            where r.course_id = m.course_id
              and r.user_id = p_user_id
              and r.status = 'enrolled'
              and (r.expires_at is null or r.expires_at > now())
          )
        )
    )
  );
$$;

-- A lesson: its module is accessible and the lesson is published (admins: any lesson).
create or replace function public.lesson_access(p_lesson_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select public.module_access(l.module_id, p_user_id)
      and (l.is_published or exists (select 1 from public.profiles where id = p_user_id and role = 'admin'))
    from public.course_lessons l
    where l.id = p_lesson_id
  ), false);
$$;

revoke all on function public.lesson_access(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Saving progress (the player calls this every ~15 s and on "ended").
--    p_completed: true = mark complete, false = un-mark, null = automatic
--    (complete once 90% of the video has been reached).

create or replace function public.save_lesson_progress(
  p_lesson_id uuid,
  p_position_sec integer,
  p_duration_sec integer default null,
  p_completed boolean default null
)
returns table (position_sec integer, completed boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_course uuid;
  v_duration integer;
  v_position integer := greatest(coalesce(p_position_sec, 0), 0);
  v_auto boolean;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not public.lesson_access(p_lesson_id, v_user) then
    raise exception 'no access to this lesson' using errcode = '42501';
  end if;

  select m.course_id, coalesce(v.duration_sec, nullif(p_duration_sec, 0))
  into v_course, v_duration
  from public.course_lessons l
  join public.course_modules m on m.id = l.module_id
  left join public.course_lesson_videos v on v.lesson_id = l.id
  where l.id = p_lesson_id;

  if v_duration is not null then
    v_position := least(v_position, v_duration);
  end if;
  v_auto := v_duration is not null and v_duration > 0 and v_position >= 0.9 * v_duration;

  insert into public.lesson_progress as p (user_id, lesson_id, course_id, position_sec, watched_sec, completed, completed_at, updated_at)
  values (
    v_user, p_lesson_id, v_course, v_position, v_position,
    coalesce(p_completed, v_auto),
    case when coalesce(p_completed, v_auto) then now() end,
    now()
  )
  on conflict (user_id, lesson_id) do update set
    position_sec = excluded.position_sec,
    watched_sec = greatest(p.watched_sec, excluded.watched_sec),
    completed = case when p_completed is not null then p_completed else p.completed or v_auto end,
    completed_at = case
      when (case when p_completed is not null then p_completed else p.completed or v_auto end)
        then coalesce(p.completed_at, now())
    end,
    updated_at = now();

  return query
    select p.position_sec, p.completed from public.lesson_progress p
    where p.user_id = v_user and p.lesson_id = p_lesson_id;
end;
$$;

revoke all on function public.save_lesson_progress(uuid, integer, integer, boolean) from public, anon;
grant execute on function public.save_lesson_progress(uuid, integer, integer, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. One course's syllabus with the caller's state per lesson — the player
--    sidebar and lock icons. The UI shows `state`; it never works access out.
--
--    state: open | locked | signin (free, signed out) | coming_soon | processing (video not ready)
--    Modules with no lessons come back as one row with null lesson columns.

create or replace function public.course_outline(p_course_slug text)
returns table (
  course_id uuid,
  course_title text,
  module_id uuid,
  module_code text,
  module_title text,
  module_order integer,
  module_is_free boolean,
  module_released boolean,
  release_label text,
  lesson_id uuid,
  lesson_code text,
  lesson_title text,
  lesson_kind text,
  lesson_description text,
  lesson_order integer,
  duration_minutes integer,
  duration_sec integer,
  state text,
  completed boolean,
  position_sec integer
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select auth.uid() as uid,
           exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') as admin
  )
  select
    c.id, c.title,
    m.id, m.code, m.title, m.order_number, m.is_free, m.is_released, m.release_label,
    l.id, l.code, l.title, l.kind, l.description, l.order_number, l.duration_minutes,
    v.duration_sec,
    case
      when l.id is null then null
      when not me.admin and (not m.is_released or not l.is_published) then 'coming_soon'
      when me.uid is null then case when m.is_free then 'signin' else 'locked' end
      when not public.module_access(m.id, me.uid) then 'locked'
      when l.kind = 'video' and coalesce(v.encode_status, 'none') <> 'ready' then 'processing'
      else 'open'
    end,
    coalesce(p.completed, false),
    coalesce(p.position_sec, 0)
  from me
  cross join public.courses c
  join public.course_modules m on m.course_id = c.id
  left join public.course_lessons l on l.module_id = m.id
  left join public.course_lesson_videos v on v.lesson_id = l.id
  left join public.lesson_progress p on p.lesson_id = l.id and p.user_id = me.uid
  where c.slug = p_course_slug and (c.is_published or me.admin)
  order by m.order_number, l.order_number;
$$;

revoke all on function public.course_outline(text) from public;
grant execute on function public.course_outline(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. "My Learning": one row per recorded course the caller can open.
--    access: enrolled | expired | preview (free modules only) | admin
--    Progress counts lessons that are published in released modules.
--    next_*: where "Continue" goes — the last lesson touched if unfinished,
--    else the next open lesson after it, else the first open lesson.

create or replace function public.my_learning()
returns table (
  course_id uuid,
  slug text,
  title text,
  level text,
  access text,
  expires_at timestamptz,
  total_lessons integer,
  completed_lessons integer,
  next_lesson_code text,
  next_lesson_title text,
  next_position_sec integer,
  last_watched_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select auth.uid() as uid,
           exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') as admin
  ),
  lessons as (
    select c.id as course_id, l.id as lesson_id, l.code, l.title, m.is_free,
           row_number() over (partition by c.id order by m.order_number, l.order_number) as seq
    from public.courses c
    join public.course_modules m on m.course_id = c.id
    join public.course_lessons l on l.module_id = m.id
    where m.is_released and l.is_published
  ),
  enrollment as (
    select r.course_id, r.expires_at,
           (r.expires_at is null or r.expires_at > now()) as active
    from public.course_registrations r, me
    where r.user_id = me.uid and r.status = 'enrolled'
  ),
  courses as (
    select c.id, c.slug, c.title, c.level,
           case
             when me.admin then 'admin'
             when e.active then 'enrolled'
             when e.course_id is not null then 'expired'
             else 'preview'
           end as access,
           e.expires_at
    from public.courses c
    cross join me
    left join enrollment e on e.course_id = c.id
    where me.uid is not null
      and c.bundle_course_ids is null
      and (c.is_published or me.admin)
      and exists (select 1 from lessons x where x.course_id = c.id)
      and (me.admin or e.course_id is not null or exists (select 1 from lessons x where x.course_id = c.id and x.is_free))
  ),
  open_lessons as (
    select l.*, k.access from lessons l join courses k on k.id = l.course_id
    where k.access in ('admin', 'enrolled') or l.is_free
  ),
  progress as (
    select p.* from public.lesson_progress p, me where p.user_id = me.uid
  ),
  last_touch as (
    select distinct on (p.course_id) p.course_id, p.lesson_id, p.completed, p.position_sec, p.updated_at, l.seq
    from progress p join lessons l on l.lesson_id = p.lesson_id
    order by p.course_id, p.updated_at desc
  ),
  next_lesson as (
    select k.id as course_id,
           coalesce(
             -- unfinished last lesson
             (select t.lesson_id from last_touch t where t.course_id = k.id and not t.completed),
             -- next open, unfinished lesson after the last one touched
             (select o.lesson_id from open_lessons o
                left join last_touch t on t.course_id = o.course_id
                where o.course_id = k.id and o.seq > coalesce(t.seq, 0)
                  and not exists (select 1 from progress p where p.lesson_id = o.lesson_id and p.completed)
                order by o.seq limit 1),
             -- first open lesson
             (select o.lesson_id from open_lessons o where o.course_id = k.id order by o.seq limit 1)
           ) as lesson_id
    from courses k
  )
  select
    k.id, k.slug, k.title, k.level, k.access, k.expires_at,
    (select count(*)::int from lessons l where l.course_id = k.id),
    (select count(*)::int from progress p join lessons l on l.lesson_id = p.lesson_id
       where l.course_id = k.id and p.completed),
    l.code, l.title,
    coalesce((select p.position_sec from progress p where p.lesson_id = n.lesson_id and not p.completed), 0),
    (select t.updated_at from last_touch t where t.course_id = k.id)
  from courses k
  left join next_lesson n on n.course_id = k.id
  left join lessons l on l.lesson_id = n.lesson_id
  order by (select t.updated_at from last_touch t where t.course_id = k.id) desc nulls last, k.title;
$$;

revoke all on function public.my_learning() from public, anon;
grant execute on function public.my_learning() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Purchases for the profile page (titles even for unlisted bundle courses).

create or replace function public.my_purchases()
returns table (
  razorpay_order_id text,
  razorpay_payment_id text,
  course_title text,
  amount integer,
  currency text,
  paid_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.razorpay_order_id, p.razorpay_payment_id, c.title, p.amount, p.currency, p.paid_at
  from public.payments p
  join public.courses c on c.id = p.course_id
  where p.user_id = auth.uid() and p.status = 'paid'
  order by p.paid_at desc;
$$;

revoke all on function public.my_purchases() from public, anon;
grant execute on function public.my_purchases() to authenticated;

-- ---------------------------------------------------------------------------
-- 11. mark_payment_paid: record the source and the access period. Buying
--     again (or buying the Combo after Level 1) extends access to whichever
--     ends later. Same as 20261103090000 otherwise; still idempotent.

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

  -- The course bought, then (for a bundle such as the Combo) each included course.
  insert into public.course_registrations as r (user_id, course_id, status, source, enrolled_at, expires_at)
  select v_payment.user_id, t.course_id, 'enrolled', t.source, now(),
         case when c.access_days is not null then now() + make_interval(days => c.access_days) end
  from (
    select v_payment.course_id as course_id, 'razorpay'::text as source
    union
    select b.course_id, 'bundle'
    from public.courses bc
    cross join lateral unnest(bc.bundle_course_ids) as b(course_id)
    where bc.id = v_payment.course_id
  ) t
  join public.courses c on c.id = t.course_id
  on conflict (user_id, course_id) do update set
    status = 'enrolled',
    source = excluded.source,
    enrolled_at = case when r.status = 'enrolled' then coalesce(r.enrolled_at, excluded.enrolled_at) else excluded.enrolled_at end,
    expires_at = case
      -- Lifetime course, or already lifetime while enrolled: stays lifetime.
      when excluded.expires_at is null then null
      when r.status = 'enrolled' and r.expires_at is null then null
      when r.status = 'enrolled' then greatest(r.expires_at, excluded.expires_at)
      else excluded.expires_at
    end;

  return 'paid';
end;
$$;

revoke all on function public.mark_payment_paid(text, text, integer) from public, anon, authenticated;
