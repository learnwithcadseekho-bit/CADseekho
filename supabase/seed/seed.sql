-- Seed data for the initial course catalog (SPEC.md Section 33).
-- Safe to re-run: every insert is guarded with on conflict do nothing.
-- All content here is editable later from /admin — nothing is hardcoded in React.

-- Categories. ANSYS and Teamcenter are seeded with zero courses so the
-- homepage's "Coming Soon" state (Section 9) falls out naturally from an
-- empty published-course count, rather than a separate flag.
insert into public.categories (name, slug, description, is_active)
values
  ('AutoCAD', 'autocad', 'Professional AutoCAD training for mechanical, civil, and interior drafting workflows.', true),
  ('SolidWorks', 'solidworks', 'SolidWorks training from fundamentals through advanced part modeling, sheet metal, and weldments.', true),
  ('ANSYS', 'ansys', 'Simulation training covering ANSYS Workbench, Mechanical, and Fluent.', true),
  ('Teamcenter', 'teamcenter', 'PLM training covering Teamcenter essentials, BMIDE, administration, and workflow.', true)
on conflict (slug) do nothing;

-- Courses
insert into public.courses (category_id, title, slug, short_description, description, level, software, prerequisites, is_featured, is_published)
values
  (
    (select id from public.categories where slug = 'autocad'),
    'AutoCAD Mastery: Mechanical',
    'autocad-mastery-mechanical',
    'Professional AutoCAD training focused on mechanical drafting, engineering drawings, layouts, detailing, and practical mechanical design.',
    'Professional AutoCAD training focused on mechanical drafting, engineering drawings, layouts, detailing, and practical mechanical design.',
    'intermediate', 'AutoCAD', 'Basic familiarity with engineering drawings is helpful but not required.',
    true, true
  ),
  (
    (select id from public.categories where slug = 'autocad'),
    'AutoCAD Mastery: Civil',
    'autocad-mastery-civil',
    'AutoCAD training focused on civil drafting, plans, layouts, construction drawings, and practical civil design workflows.',
    'AutoCAD training focused on civil drafting, plans, layouts, construction drawings, and practical civil design workflows.',
    'intermediate', 'AutoCAD', 'Basic familiarity with engineering drawings is helpful but not required.',
    false, true
  ),
  (
    (select id from public.categories where slug = 'autocad'),
    'AutoCAD Mastery: Interior',
    'autocad-mastery-interior',
    'AutoCAD training focused on interior layouts, furniture planning, space planning, detailing, and professional interior drawings.',
    'AutoCAD training focused on interior layouts, furniture planning, space planning, detailing, and professional interior drawings.',
    'intermediate', 'AutoCAD', 'Basic familiarity with engineering drawings is helpful but not required.',
    false, true
  ),
  (
    (select id from public.categories where slug = 'solidworks'),
    'SolidWorks Essentials',
    'solidworks-essentials',
    'Beginner-focused SolidWorks course covering fundamentals, sketching, part modeling, assemblies, drawings, and practical modeling workflows.',
    'Beginner-focused SolidWorks course covering fundamentals, sketching, part modeling, assemblies, drawings, and practical modeling workflows.',
    'beginner', 'SolidWorks', 'None — designed for first-time SolidWorks users.',
    true, true
  ),
  (
    (select id from public.categories where slug = 'solidworks'),
    'SolidWorks Advanced Part Modeling',
    'solidworks-advanced-part-modeling',
    'Advanced SolidWorks course focused on complex part modeling, advanced features, design intent, complex geometry, and professional modeling techniques.',
    'Advanced SolidWorks course focused on complex part modeling, advanced features, design intent, complex geometry, and professional modeling techniques.',
    'advanced', 'SolidWorks', 'Completion of SolidWorks Essentials or equivalent working knowledge.',
    false, true
  ),
  (
    (select id from public.categories where slug = 'solidworks'),
    'SolidWorks Sheet Metal',
    'solidworks-sheet-metal',
    'SolidWorks training focused on sheet-metal design, base flanges, bends, edge flanges, hems, unfold/fold operations, and manufacturing-ready models.',
    'SolidWorks training focused on sheet-metal design, base flanges, bends, edge flanges, hems, unfold/fold operations, and manufacturing-ready models.',
    'intermediate', 'SolidWorks', 'Completion of SolidWorks Essentials or equivalent working knowledge.',
    false, true
  ),
  (
    (select id from public.categories where slug = 'solidworks'),
    'SolidWorks Weldments',
    'solidworks-weldments',
    'SolidWorks training focused on structural members, weldment profiles, trim/extend, gussets, weldment cut lists, and fabrication-oriented design.',
    'SolidWorks training focused on structural members, weldment profiles, trim/extend, gussets, weldment cut lists, and fabrication-oriented design.',
    'intermediate', 'SolidWorks', 'Completion of SolidWorks Essentials or equivalent working knowledge.',
    true, true
  )
on conflict (slug) do nothing;

-- Modules (Section 14: "Make the syllabus database-driven")
insert into public.course_modules (course_id, title, order_number)
select c.id, m.title, m.order_number
from public.courses c
join (
  values
    ('autocad-mastery-mechanical', 'AutoCAD Interface & Setup', 1),
    ('autocad-mastery-mechanical', '2D Drafting Fundamentals', 2),
    ('autocad-mastery-mechanical', 'Mechanical Drawing Standards & Annotation', 3),
    ('autocad-mastery-mechanical', 'Blocks, Layers & Templates', 4),
    ('autocad-mastery-mechanical', 'Dimensioning & Tolerancing Basics', 5),
    ('autocad-mastery-mechanical', 'Detailing Mechanical Components', 6),
    ('autocad-mastery-mechanical', 'Practical Mechanical Drawing Projects', 7),

    ('autocad-mastery-civil', 'AutoCAD Interface & Setup', 1),
    ('autocad-mastery-civil', 'Civil Drafting Fundamentals', 2),
    ('autocad-mastery-civil', 'Site Plans & Layouts', 3),
    ('autocad-mastery-civil', 'Construction Drawing Standards', 4),
    ('autocad-mastery-civil', 'Annotation & Civil Detailing', 5),
    ('autocad-mastery-civil', 'Working with Civil Templates & Layers', 6),
    ('autocad-mastery-civil', 'Practical Civil Drawing Projects', 7),

    ('autocad-mastery-interior', 'AutoCAD Interface & Setup', 1),
    ('autocad-mastery-interior', 'Space Planning Fundamentals', 2),
    ('autocad-mastery-interior', 'Furniture Layouts & Blocks', 3),
    ('autocad-mastery-interior', 'Interior Detailing & Sections', 4),
    ('autocad-mastery-interior', 'Annotation & Dimensioning for Interiors', 5),
    ('autocad-mastery-interior', 'Presentation Drawings & Layouts', 6),
    ('autocad-mastery-interior', 'Practical Interior Drawing Projects', 7),

    ('solidworks-essentials', 'SolidWorks Interface', 1),
    ('solidworks-essentials', 'Sketching', 2),
    ('solidworks-essentials', 'Part Modeling', 3),
    ('solidworks-essentials', 'Features', 4),
    ('solidworks-essentials', 'Assemblies', 5),
    ('solidworks-essentials', 'Engineering Drawings', 6),
    ('solidworks-essentials', 'Practical Projects', 7),

    ('solidworks-advanced-part-modeling', 'Advanced Sketch Techniques', 1),
    ('solidworks-advanced-part-modeling', 'Complex Feature Modeling', 2),
    ('solidworks-advanced-part-modeling', 'Multibody & Design Intent', 3),
    ('solidworks-advanced-part-modeling', 'Surfacing Fundamentals', 4),
    ('solidworks-advanced-part-modeling', 'Configurations & Design Tables', 5),
    ('solidworks-advanced-part-modeling', 'Advanced Drawing Techniques', 6),
    ('solidworks-advanced-part-modeling', 'Practical Advanced Modeling Projects', 7),

    ('solidworks-sheet-metal', 'Sheet Metal Fundamentals', 1),
    ('solidworks-sheet-metal', 'Base Flanges & Bends', 2),
    ('solidworks-sheet-metal', 'Edge Flanges & Hems', 3),
    ('solidworks-sheet-metal', 'Unfold/Fold Operations', 4),
    ('solidworks-sheet-metal', 'Sheet Metal Forming Features', 5),
    ('solidworks-sheet-metal', 'Flat Pattern & Drawings', 6),
    ('solidworks-sheet-metal', 'Practical Sheet Metal Projects', 7),

    ('solidworks-weldments', 'Weldment Fundamentals', 1),
    ('solidworks-weldments', 'Structural Members & Profiles', 2),
    ('solidworks-weldments', 'Trim/Extend & Corner Treatments', 3),
    ('solidworks-weldments', 'Gussets & End Caps', 4),
    ('solidworks-weldments', 'Weldment Cut Lists', 5),
    ('solidworks-weldments', 'Fabrication-Ready Drawings', 6),
    ('solidworks-weldments', 'Practical Weldment Projects', 7)
) as m (course_slug, title, order_number) on m.course_slug = c.slug
on conflict (course_id, order_number) do nothing;

-- Skills
insert into public.course_skills (course_id, skill_name)
select c.id, s.skill_name
from public.courses c
join (
  values
    ('autocad-mastery-mechanical', 'Mechanical Drafting'),
    ('autocad-mastery-mechanical', 'GD&T Basics'),
    ('autocad-mastery-mechanical', 'Detail Drawings'),
    ('autocad-mastery-mechanical', 'Layer & Template Management'),
    ('autocad-mastery-mechanical', 'Dimensioning'),

    ('autocad-mastery-civil', 'Civil Drafting'),
    ('autocad-mastery-civil', 'Site Plan Layout'),
    ('autocad-mastery-civil', 'Construction Documentation'),
    ('autocad-mastery-civil', 'Annotation Standards'),
    ('autocad-mastery-civil', 'Template Management'),

    ('autocad-mastery-interior', 'Space Planning'),
    ('autocad-mastery-interior', 'Furniture Layout'),
    ('autocad-mastery-interior', 'Interior Detailing'),
    ('autocad-mastery-interior', 'Presentation Drawings'),
    ('autocad-mastery-interior', 'Dimensioning'),

    ('solidworks-essentials', 'Sketching'),
    ('solidworks-essentials', 'Part Modeling'),
    ('solidworks-essentials', 'Assembly Design'),
    ('solidworks-essentials', 'Drawing Creation'),
    ('solidworks-essentials', 'Design Intent'),

    ('solidworks-advanced-part-modeling', 'Advanced Feature Modeling'),
    ('solidworks-advanced-part-modeling', 'Surfacing'),
    ('solidworks-advanced-part-modeling', 'Multibody Design'),
    ('solidworks-advanced-part-modeling', 'Design Tables'),
    ('solidworks-advanced-part-modeling', 'Complex Geometry'),

    ('solidworks-sheet-metal', 'Sheet Metal Design'),
    ('solidworks-sheet-metal', 'Flat Pattern Development'),
    ('solidworks-sheet-metal', 'Bends & Flanges'),
    ('solidworks-sheet-metal', 'Forming Features'),
    ('solidworks-sheet-metal', 'Manufacturing-Ready Modeling'),

    ('solidworks-weldments', 'Weldment Design'),
    ('solidworks-weldments', 'Structural Member Layout'),
    ('solidworks-weldments', 'Cut Lists'),
    ('solidworks-weldments', 'Fabrication Drawings'),
    ('solidworks-weldments', 'Gusset & Corner Treatments')
) as s (course_slug, skill_name) on s.course_slug = c.slug
on conflict (course_id, skill_name) do nothing;
