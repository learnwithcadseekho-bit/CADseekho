-- Demo resources for building/testing the Resources hub UI.
-- Every slug starts with "demo-" so they are easy to remove before launch:
--   delete from public.resources where slug like 'demo-%';
-- (link rows, premium rows, relations and path items cascade.)
-- Safe to re-run: guarded with on conflict do nothing.

insert into public.resources (slug, title, summary, body, type, level, access, required_entitlement, course_cta, status)
values
  ('demo-euler-buckling-cheat-sheet',
   'Euler Buckling Cheat Sheet',
   'Critical load, effective length factors and slenderness limits for columns on one page.',
   '<h2>Critical load</h2><p>P<sub>cr</sub> = π²EI / (KL)². Pick K from the end conditions table below.</p>',
   'cheat_sheet', 'beginner', 'free', null,
   '{"label": "Master this in Level 1 →", "url": "/courses/ansys-workbench-level-1"}', 'published'),
  ('demo-ansys-mesh-convergence-tutorial',
   'Mesh Convergence Study in ANSYS Workbench',
   'Refine the mesh until peak stress stops changing — and know when to stop.',
   '<p>A converged mesh is one where the result you care about changes by less than about 2% on the next refinement.</p>',
   'tutorial', 'intermediate', 'partial', 'member',
   '{"label": "Master this in Level 1 →", "url": "/courses/ansys-workbench-level-1"}', 'published'),
  ('demo-solidworks-sheet-metal-k-factor',
   'Sheet Metal K-Factor in SolidWorks',
   'What the K-factor controls, typical values, and how to set it per part.',
   '<p>The K-factor locates the neutral axis as a fraction of thickness, usually 0.3–0.5.</p>',
   'guide', 'beginner', 'free', null, null, 'published'),
  ('demo-sw-simulation-plate-hole-validation',
   'Validate a Plate-with-Hole Kt in SolidWorks Simulation',
   'Build the model, refine at the hole and compare the peak stress with the hand calculation.',
   '',
   'tutorial', 'intermediate', 'paid', 'member',
   '{"label": "Get full access with any course →", "url": "/courses"}', 'published'),
  ('demo-gdt-position-tolerance-solved',
   'Position Tolerance — Solved Problem',
   'Bonus tolerance at MMC worked through step by step for a four-hole pattern.',
   '<p>Given a Ø10 +0.2/−0 hole with position Ø0.1 at MMC, find the allowed position error at LMC.</p>',
   'solved_problem', 'intermediate', 'free', null, null, 'published'),
  ('demo-fea-interview-questions-1',
   'FEA Interview Questions — Set 1',
   '25 questions interviewers ask freshers about meshing, contacts and boundary conditions.',
   '<p>Q1. Why do we check mesh convergence?</p>',
   'interview_qa', 'beginner', 'partial', 'member', null, 'published'),
  ('demo-draft-not-visible',
   'Draft Resource (should never appear publicly)',
   'Used to check that drafts stay hidden.',
   '', 'guide', 'beginner', 'free', null, null, 'draft')
on conflict (slug) do nothing;

insert into public.resource_software (resource_id, software_id)
select r.id, s.id
from (values
  ('demo-euler-buckling-cheat-sheet', 'general'),
  ('demo-ansys-mesh-convergence-tutorial', 'ansys'),
  ('demo-solidworks-sheet-metal-k-factor', 'solidworks'),
  ('demo-sw-simulation-plate-hole-validation', 'solidworks-simulation'),
  ('demo-gdt-position-tolerance-solved', 'general'),
  ('demo-gdt-position-tolerance-solved', 'solidworks'),
  ('demo-fea-interview-questions-1', 'ansys'),
  ('demo-fea-interview-questions-1', 'solidworks-simulation'),
  ('demo-draft-not-visible', 'solidworks')
) as m (resource_slug, software_slug)
join public.resources r on r.slug = m.resource_slug
join public.software s on s.slug = m.software_slug
on conflict do nothing;

insert into public.resource_topics (resource_id, topic_id)
select r.id, t.id
from (values
  ('demo-euler-buckling-cheat-sheet', 'buckling'),
  ('demo-ansys-mesh-convergence-tutorial', 'meshing'),
  ('demo-solidworks-sheet-metal-k-factor', 'sheet-metal'),
  ('demo-sw-simulation-plate-hole-validation', 'stress-concentration'),
  ('demo-sw-simulation-plate-hole-validation', 'meshing'),
  ('demo-gdt-position-tolerance-solved', 'drawings-gdt'),
  ('demo-gdt-position-tolerance-solved', 'fits-tolerances'),
  ('demo-fea-interview-questions-1', 'meshing'),
  ('demo-fea-interview-questions-1', 'contact')
) as m (resource_slug, topic_slug)
join public.resources r on r.slug = m.resource_slug
join public.topics t on t.slug = m.topic_slug
on conflict do nothing;

insert into public.resource_premium (resource_id, payload)
select r.id, m.payload::jsonb
from (values
  ('demo-ansys-mesh-convergence-tutorial', '{"html": "<h2>Step-by-step</h2><p>DEMO PREMIUM: refine by a factor of 1.5 each run…</p>"}'),
  ('demo-sw-simulation-plate-hole-validation', '{"html": "<h2>Full tutorial</h2><p>DEMO PREMIUM: quarter model, two symmetry fixtures…</p>"}'),
  ('demo-fea-interview-questions-1', '{"html": "<p>DEMO PREMIUM: Q2–Q25 with model answers.</p>"}')
) as m (resource_slug, payload)
join public.resources r on r.slug = m.resource_slug
on conflict (resource_id) do nothing;

insert into public.resource_related (resource_id, related_id, relation)
select a.id, b.id, m.relation::public.resource_relation
from (values
  ('demo-ansys-mesh-convergence-tutorial', 'demo-sw-simulation-plate-hole-validation', 'same_topic_other_software'),
  ('demo-sw-simulation-plate-hole-validation', 'demo-ansys-mesh-convergence-tutorial', 'prerequisite'),
  ('demo-euler-buckling-cheat-sheet', 'demo-ansys-mesh-convergence-tutorial', 'next_level')
) as m (from_slug, to_slug, relation)
join public.resources a on a.slug = m.from_slug
join public.resources b on b.slug = m.to_slug
on conflict do nothing;

insert into public.learning_paths (slug, title, software_id, description, sort_order)
values ('demo-ansys-start-here', 'ANSYS: Start here', (select id from public.software where slug = 'ansys'),
        'Hand calcs first, then your first converged simulation.', 10)
on conflict (slug) do nothing;

insert into public.learning_path_items (path_id, resource_id, position)
select p.id, r.id, m.position
from (values
  ('demo-euler-buckling-cheat-sheet', 1),
  ('demo-ansys-mesh-convergence-tutorial', 2),
  ('demo-fea-interview-questions-1', 3)
) as m (resource_slug, position)
join public.learning_paths p on p.slug = 'demo-ansys-start-here'
join public.resources r on r.slug = m.resource_slug
on conflict do nothing;
