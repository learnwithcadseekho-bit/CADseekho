-- Content update: remove Teamcenter, add 2 ANSYS Workbench courses so ANSYS
-- stops showing "Coming Soon", and add a new Creo category with 1 course.
-- Safe to re-run: inserts are guarded with on conflict do nothing.

-- Teamcenter has no courses attached, so this delete is clean (courses.category_id
-- is ON DELETE RESTRICT, so this would fail loudly instead of cascading if that
-- ever changes).
delete from public.categories where slug = 'teamcenter';

insert into public.categories (name, slug, description, is_active)
values ('Creo', 'creo', 'PTC Creo training for parametric modeling and mechanism simulation.', true)
on conflict (slug) do nothing;

insert into public.courses (category_id, title, slug, short_description, description, level, software, prerequisites, is_featured, is_published)
values
  (
    (select id from public.categories where slug = 'ansys'),
    'ANSYS Workbench Level 1',
    'ansys-workbench-level-1',
    'Simulation training focused on ANSYS Workbench fundamentals, project setup, meshing basics, and running your first structural simulations.',
    'Simulation training focused on ANSYS Workbench fundamentals, project setup, meshing basics, and running your first structural simulations.',
    'beginner', 'ANSYS Workbench', 'None — designed for first-time ANSYS Workbench users.',
    false, true
  ),
  (
    (select id from public.categories where slug = 'ansys'),
    'ANSYS Workbench Level 2',
    'ansys-workbench-level-2',
    'Simulation training focused on intermediate ANSYS Workbench workflows, advanced meshing, boundary conditions, and result interpretation for more complex analyses.',
    'Simulation training focused on intermediate ANSYS Workbench workflows, advanced meshing, boundary conditions, and result interpretation for more complex analyses.',
    'intermediate', 'ANSYS Workbench', 'Completion of ANSYS Workbench Level 1 or equivalent working knowledge.',
    false, true
  ),
  (
    (select id from public.categories where slug = 'creo'),
    'Creo Mechanism',
    'creo-mechanism',
    'Creo training focused on mechanism design, kinematic analysis, motion simulation, and practical mechanism workflows.',
    'Creo training focused on mechanism design, kinematic analysis, motion simulation, and practical mechanism workflows.',
    'intermediate', 'PTC Creo', 'Basic familiarity with Creo part and assembly modeling is helpful but not required.',
    false, true
  )
on conflict (slug) do nothing;

insert into public.course_modules (course_id, title, order_number)
select c.id, m.title, m.order_number
from public.courses c
join (
  values
    ('ansys-workbench-level-1', 'ANSYS Workbench Interface & Setup', 1),
    ('ansys-workbench-level-1', 'Simulation Project Fundamentals', 2),
    ('ansys-workbench-level-1', 'Geometry Import & Cleanup', 3),
    ('ansys-workbench-level-1', 'Meshing Basics', 4),
    ('ansys-workbench-level-1', 'Applying Loads & Boundary Conditions', 5),
    ('ansys-workbench-level-1', 'Running & Reviewing Basic Simulations', 6),
    ('ansys-workbench-level-1', 'Practical Beginner Simulation Projects', 7),

    ('ansys-workbench-level-2', 'Advanced Meshing Techniques', 1),
    ('ansys-workbench-level-2', 'Contact & Connections', 2),
    ('ansys-workbench-level-2', 'Nonlinear & Complex Boundary Conditions', 3),
    ('ansys-workbench-level-2', 'Static Structural Analysis Workflows', 4),
    ('ansys-workbench-level-2', 'Result Interpretation & Validation', 5),
    ('ansys-workbench-level-2', 'Simulation Reporting', 6),
    ('ansys-workbench-level-2', 'Practical Intermediate Simulation Projects', 7),

    ('creo-mechanism', 'Creo Mechanism Interface & Setup', 1),
    ('creo-mechanism', 'Building Mechanism Assemblies', 2),
    ('creo-mechanism', 'Defining Connections & Joints', 3),
    ('creo-mechanism', 'Servo Motors & Drivers', 4),
    ('creo-mechanism', 'Kinematic & Motion Analysis', 5),
    ('creo-mechanism', 'Interference & Clearance Checks', 6),
    ('creo-mechanism', 'Practical Mechanism Design Projects', 7)
) as m (course_slug, title, order_number) on m.course_slug = c.slug
on conflict (course_id, order_number) do nothing;

insert into public.course_skills (course_id, skill_name)
select c.id, s.skill_name
from public.courses c
join (
  values
    ('ansys-workbench-level-1', 'Workbench Navigation'),
    ('ansys-workbench-level-1', 'Basic Meshing'),
    ('ansys-workbench-level-1', 'Load Application'),
    ('ansys-workbench-level-1', 'Simulation Setup'),
    ('ansys-workbench-level-1', 'Result Review'),

    ('ansys-workbench-level-2', 'Advanced Meshing'),
    ('ansys-workbench-level-2', 'Contact Modeling'),
    ('ansys-workbench-level-2', 'Nonlinear Analysis Basics'),
    ('ansys-workbench-level-2', 'Result Validation'),
    ('ansys-workbench-level-2', 'Simulation Reporting'),

    ('creo-mechanism', 'Mechanism Assembly'),
    ('creo-mechanism', 'Joint Definition'),
    ('creo-mechanism', 'Motion Simulation'),
    ('creo-mechanism', 'Kinematic Analysis'),
    ('creo-mechanism', 'Interference Checking')
) as s (course_slug, skill_name) on s.course_slug = c.slug
on conflict (course_id, skill_name) do nothing;
