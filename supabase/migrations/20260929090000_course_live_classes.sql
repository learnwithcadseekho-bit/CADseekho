-- Live classes run inside the site via the Zoom Meeting SDK (/classroom/:slug).
--
-- The meeting number and passcode live in their own table, readable only by
-- admins: anyone holding them could join from the Zoom app directly, skipping
-- the enrolment check. Students never read this table — the zoom-join Edge
-- Function checks enrolment, then hands back a short-lived SDK signature along
-- with the join details.
--
-- The class timing ("Mon, Wed, Fri · 8–9 PM IST") isn't secret, so it sits on
-- courses where the dashboard can show it without a function call.

alter table public.courses
  add column live_class_schedule text;

create table public.course_live_classes (
  course_id uuid primary key references public.courses (id) on delete cascade,
  zoom_meeting_number text not null
    check (zoom_meeting_number ~ '^[0-9]{9,12}$'),
  zoom_passcode text not null default '',
  updated_at timestamptz not null default now()
);

create trigger set_course_live_classes_updated_at
  before update on public.course_live_classes
  for each row execute function public.set_updated_at();

alter table public.course_live_classes enable row level security;

create policy "Admins manage live classes"
  on public.course_live_classes for all
  using (public.is_admin()) with check (public.is_admin());
