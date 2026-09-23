-- ANSYS Workbench Level 1 had its whole syllabus ("Chapter 1 — …" through
-- "Chapter 10 — …") inlined into courses.description under a
-- "Course Structure" heading, with no course_modules rows. Per-chapter media
-- hangs off course_modules, so move each chapter into its own module and
-- trim the inlined copy out of the description.
--
-- Guarded: only runs if the course still has no modules and the description
-- still contains the "Course Structure" section, so re-running is a no-op.
do $$
declare
  v_course_id uuid;
  v_description text;
  v_split int;
  v_chapter text;
  v_heading text;
begin
  select id, description into v_course_id, v_description
  from public.courses
  where slug = 'ansys-workbench-level-1';

  if v_course_id is null
     or exists (select 1 from public.course_modules where course_id = v_course_id) then
    return;
  end if;

  v_split := strpos(v_description, '<h1>Course Structure</h1>');
  if v_split = 0 then
    return;
  end if;

  -- Split on the chapter headings; each piece after the first looks like
  -- '3 — Beam &amp; Truss Analysis</h2><p>…</p><hr>'.
  for v_chapter in
    select piece
    from regexp_split_to_table(substr(v_description, v_split), '<h2>Chapter ') with ordinality as t(piece, n)
    where n > 1
  loop
    v_heading := split_part(v_chapter, '</h2>', 1);
    insert into public.course_modules (course_id, order_number, title, description)
    values (
      v_course_id,
      split_part(v_heading, ' — ', 1)::int,
      replace(replace(replace(substr(v_heading, strpos(v_heading, ' — ') + 3), '&lt;', '<'), '&gt;', '>'), '&amp;', '&'),
      nullif(regexp_replace(substr(v_chapter, length(v_heading) + 6), '(<hr>)+$', ''), '')
    );
  end loop;

  update public.courses
  set description = regexp_replace(left(v_description, v_split - 1), '(<hr>)+$', '')
  where id = v_course_id;
end $$;
