-- Lets the admin record enrollments confirmed outside the site (e.g. a
-- college batch booking) and a seat capacity, so the course page can show a
-- real "X enrolled" / "Y seats left" instead of only counting registrations
-- made through the site's own Register button.
--
-- The displayed enrolled count is max(registration_count, manual_enrolled_count)
-- so it only ever goes up, and site registrations still count once they
-- pass the manually-confirmed floor.

alter table public.courses
  add column manual_enrolled_count integer,
  add column seat_capacity integer;

-- ANSYS Workbench Level 1: 22 seats confirmed via a college booking, 30 total capacity.
update public.courses
set manual_enrolled_count = 22, seat_capacity = 30
where slug = 'ansys-workbench-level-1';
