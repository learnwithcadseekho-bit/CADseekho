-- Adds:
--   courses.format      — admin-selectable "Live" vs "Self-Paced" label,
--                          replacing the previously-hardcoded "Self-Paced, Online" text.
--                          This is a display attribute only, not live-class
--                          infrastructure (video/scheduling) — Section 36 still applies.
--   categories.sort_order — lets categories be shown in a deliberate order
--                          instead of always alphabetical.

alter table public.courses
  add column format text not null default 'self_paced'
    check (format in ('live', 'self_paced'));

alter table public.categories
  add column sort_order int not null default 0;

update public.categories set sort_order = 1 where slug = 'ansys';
update public.categories set sort_order = 2 where slug = 'solidworks';
update public.categories set sort_order = 3 where slug = 'autocad';
update public.categories set sort_order = 4 where slug = 'creo';
