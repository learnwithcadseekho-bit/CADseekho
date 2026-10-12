-- New URL for the renamed course: /courses/ansys-workbench-foundation.
-- The old /courses/ansys-workbench-level-1 (and /classroom/…) 301s to it; see src/content/legacyRedirects.ts.
update public.courses
set slug = 'ansys-workbench-foundation'
where slug = 'ansys-workbench-level-1';
