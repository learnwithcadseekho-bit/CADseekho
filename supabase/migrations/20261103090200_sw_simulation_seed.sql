-- Seed: "SOLIDWORKS Simulation for Industry Professionals".
--   Level 1: Foundation   (published; M0–M2 free, M0 + M1 released, M2–M7 + capstone "Coming soon")
--   Level 2: Professional (unpublished, coming soon)
--   Combo                 (unpublished bundle: buying it enrolls into Level 1 and Level 2)
--
-- Idempotent: every insert is keyed (course slug, module code, lesson code,
-- file path) and skips rows that already exist, so running it twice — or
-- after you've edited things in the admin — changes nothing.
--
-- The syllabus mirrors src/content/swSimulation.ts (tests/sw-simulation.test.ts
-- checks they match). Prices mirror the active tier in
-- supabase/functions/_shared/sw-simulation.config.json; checkout reads the
-- config itself, courses.price is only what listings display.
--
-- Lessons start unpublished. Paste each Bunny video id in
-- Admin → Courses → Level 1 → Lessons & videos, then tick Published.

insert into public.categories (name, slug, description, is_active)
values ('SolidWorks', 'solidworks', 'SolidWorks training from fundamentals through advanced part modeling, sheet metal, and weldments.', true)
on conflict (slug) do nothing;

insert into public.courses (
  category_id, title, slug, short_description, description, level, software, prerequisites,
  format, price, is_featured, is_published
)
values
  (
    (select id from public.categories where slug = 'solidworks'),
    'SOLIDWORKS Simulation Level 1 — Foundation',
    'solidworks-simulation',
    'Linear static analysis of parts, every result checked by hand. Self-paced, ~28 h. Modules 1–2 free.',
    '<p>For working design engineers who already model in SOLIDWORKS. Every problem is solved by hand, then in SOLIDWORKS Simulation, and compared — then reported on a one-page validation sheet.</p>',
    'intermediate',
    'SOLIDWORKS Simulation',
    'SOLIDWORKS part/assembly skills and diploma/BE-level strength of materials.',
    'self_paced', 3999, false, true
  ),
  (
    (select id from public.categories where slug = 'solidworks'),
    'SOLIDWORKS Simulation Level 2 — Professional',
    'solidworks-simulation-level-2',
    'Shells, frames, assemblies, bolted joints, thermal, buckling and optimization. Self-paced, ~35 h.',
    null,
    'advanced',
    'SOLIDWORKS Simulation',
    'Level 1: Foundation, or equivalent experience.',
    'self_paced', null, false, false
  ),
  (
    (select id from public.categories where slug = 'solidworks'),
    'SOLIDWORKS Simulation Level 1 + 2 (Combo)',
    'solidworks-simulation-combo',
    'Level 1: Foundation and Level 2: Professional together.',
    null,
    'intermediate',
    'SOLIDWORKS Simulation',
    null,
    'self_paced', 8999, false, false
  )
on conflict (slug) do nothing;

update public.courses
set bundle_course_ids = array[
  (select id from public.courses where slug = 'solidworks-simulation'),
  (select id from public.courses where slug = 'solidworks-simulation-level-2')
]
where slug = 'solidworks-simulation-combo' and bundle_course_ids is null;

-- Modules -------------------------------------------------------------------

insert into public.course_modules (course_id, code, order_number, title, hours, is_free, is_released)
select c.id, m.code, m.ord, m.title, m.hours, m.is_free, m.is_released
from public.courses c
cross join (values
  ('L1-M0', 1, 'Mechanics refresher: stress, strain, Mohr''s circle, von Mises', 1.0, true, true),
  ('L1-M1', 2, 'How FEA works and your first static study', 3.5, true, true),
  ('L1-M2', 3, 'Reading results: stress, displacement, strain', 3.5, true, false),
  ('L1-M3', 4, 'Materials, failure criteria and factor of safety', 3.5, false, false),
  ('L1-M4', 5, 'Axial, torsion, bending and beam shear', 3.5, false, false),
  ('L1-M5', 6, 'Mesh, convergence, stress concentration and singularities', 4.0, false, false),
  ('L1-M6', 7, 'Realistic loads and fixtures: split lines, curved beams, reactions', 3.5, false, false),
  ('L1-M7', 8, 'Symmetry and 2D simplification', 2.5, false, false),
  ('L1-CP', 9, 'Industrial bracket validation report', 3.0, false, false)
) as m(code, ord, title, hours, is_free, is_released)
where c.slug = 'solidworks-simulation'
on conflict (course_id, code) where code is not null do nothing;

insert into public.course_modules (course_id, code, order_number, title, hours, is_free, is_released)
select c.id, m.code, m.ord, m.title, m.hours, false, false
from public.courses c
cross join (values
  ('L2-M1', 1, 'Shells and sheet-metal parts', 3.5),
  ('L2-M2', 2, 'Thick-walled and axisymmetric parts', 3.5),
  ('L2-M3', 3, 'Beams, trusses and weldment frames', 3.5),
  ('L2-M4', 4, 'Assemblies: contact and interference fits', 4.5),
  ('L2-M5', 5, 'Bolted joints and connectors', 3.5),
  ('L2-M6', 6, 'Complex structures, mixed mesh and design scenarios', 3.5),
  ('L2-M7', 7, 'Thermal stress, indeterminate structures, strain energy', 2.5),
  ('L2-M8', 8, 'Linear buckling', 3.0),
  ('L2-M9', 9, 'Design studies and optimization', 3.5),
  ('L2-CP', 10, 'Industrial assembly validation report', 4.0)
) as m(code, ord, title, hours)
where c.slug = 'solidworks-simulation-level-2'
on conflict (course_id, code) where code is not null do nothing;

-- Lessons (M0, M1) -----------------------------------------------------------

insert into public.course_lessons (module_id, code, order_number, title, kind, duration_minutes, is_published)
select m.id, l.code, l.ord, l.title, l.kind, l.minutes, false
from public.course_modules m
join public.courses c on c.id = m.course_id and c.slug = 'solidworks-simulation'
join (values
  ('L1-M0', 'M0.1', 1, 'Stress, strain and Hooke''s law', 'video', 10),
  ('L1-M0', 'M0.2', 2, 'Axial, bending, torsion and shear formulas', 'video', 15),
  ('L1-M0', 'M0.3', 3, 'Principal stress and Mohr''s circle', 'video', 15),
  ('L1-M0', 'M0.4', 4, 'Von Mises stress', 'video', 10),
  ('L1-M0', 'M0-QUIZ', 5, 'M0 Quiz', 'quiz', null),
  ('L1-M1', 'M1.1', 1, 'Why designers need FEA (and what it cannot do)', 'video', 15),
  ('L1-M1', 'M1.2', 2, 'Nodes, elements, degrees of freedom, stiffness', 'video', 25),
  ('L1-M1', 'M1.3', 3, 'Element types and linear-static assumptions', 'video', 20),
  ('L1-M1', 'M1.4', 4, 'SOLIDWORKS Simulation interface and workflow', 'video', 20),
  ('L1-M1', 'M1.5', 5, 'First study end to end: cantilever demo', 'video', 40),
  ('L1-M1', 'M1-PROB', 6, 'M1 Problems P1–P3', 'problems', null),
  ('L1-M1', 'M1-TEST', 7, 'M1 Test', 'test', null)
) as l(module_code, code, ord, title, kind, minutes) on l.module_code = m.code
on conflict (module_id, code) do nothing;

-- Downloads (M1). Upload the files to the "course-files" bucket at exactly these paths.

insert into public.course_files (module_id, title, storage_path, order_number)
select m.id, f.title, f.path, f.ord
from public.course_modules m
join public.courses c on c.id = m.course_id and c.slug = 'solidworks-simulation'
join (values
  ('L1-M1', 'SOLIDWORKS part files (start)', 'L1-M1/L1M1_Start_Files.zip', 1),
  ('L1-M1', 'Slide notes (PDF)', 'L1-M1/L1_M1_Slides.pdf', 2),
  ('L1-M1', 'Validation sheet template', 'L1-M1/Validation_Sheet_Template.xlsx', 3)
) as f(module_code, title, path, ord) on f.module_code = m.code
on conflict (storage_path) do nothing;
