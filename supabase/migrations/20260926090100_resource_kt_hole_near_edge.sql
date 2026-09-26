-- Second Resources hub calculator (spec 6B): hole near the edge of a
-- semi-infinite plate in tension. Component: src/calculators/KtHoleNearEdge.tsx
-- ('kt-hole-near-edge'). Locked content in resource_premium, members only.
-- Also links the plate-with-hole calculator to it as its next level.
-- Idempotent: re-running leaves existing rows (and admin edits) alone.

insert into public.resources
  (slug, title, summary, body, type, level, access, required_entitlement,
   component_key, component_props, course_cta, status)
values (
  'hole-near-edge-stress-concentration-calculator',
  'Hole Near an Edge — Stress Concentration (Kt) Calculator',
  'Find Kt and the stress at the free edge and both sides of a hole close to a plate edge, the load on the ligament, and whether it yields.',
  $body$<p>Put a hole close to a free edge and the thin strip of material between them — the ligament — has to carry the load the hole can't. The stress at the hole edge nearest the free edge climbs well above the textbook 3σ of an isolated hole.</p><h2>How to use it</h2><ul><li>Enter the hole radius a, the distance c from the hole centre to the free edge, the thickness h and the remote tensile stress σ.</li><li>Pick a material, or choose Custom and enter the yield strength.</li><li>Results update as you type. Units are mm, N and MPa.</li></ul><p>Rule of thumb: keep c at least 2a to 3a.</p>$body$,
  'calculator', 'intermediate', 'partial', 'member',
  'kt-hole-near-edge',
  '{"validation_teaser": "Use a half model with a symmetry plane through the hole centre, normal to the load."}'::jsonb,
  '{"label": "Validate it properly — ANSYS courses →", "url": "/courses/category/ansys"}'::jsonb,
  'published'
)
on conflict (slug) do nothing;

insert into public.resource_software (resource_id, software_id)
select r.id, s.id
from public.resources r
join public.software s on s.slug in ('general', 'ansys', 'solidworks-simulation')
where r.slug = 'hole-near-edge-stress-concentration-calculator'
on conflict do nothing;

insert into public.resource_topics (resource_id, topic_id)
select r.id, t.id
from public.resources r
join public.topics t on t.slug in ('stress-concentration', 'materials')
where r.slug = 'hole-near-edge-stress-concentration-calculator'
on conflict do nothing;

insert into public.resource_premium (resource_id, payload)
select r.id, $premium${
  "charts": true,
  "steps": [
    {
      "title": "Edge-distance ratio",
      "tex": [
        "x = \\frac{a}{c} = \\frac{ {{a}} }{ {{c}} } = {{x}}"
      ]
    },
    {
      "title": "Kt at B — hole edge nearest the free edge (Peterson Chart 4.2)",
      "tex": [
        "K_{tgB} = 3.0004 + 0.083503x + 7.3417x^2 - 38.046x^3 + 106.037x^4 - 130.133x^5 + 65.065x^6",
        "\\text{at } x = {{x}}: \\quad K_{tgB} = {{KtgB}}"
      ]
    },
    {
      "title": "Kt at A (free edge) and C (far side of the hole)",
      "tex": [
        "K_{tgA} = 0.99619 - 0.43879x - 0.0613028x^2 - 0.48941x^3 = {{KtgA}}",
        "K_{tgC} = 2.9943 + 0.54971x - 2.32876x^2 + 8.9718x^3 - 13.344x^4 + 7.1452x^5 = {{KtgC}}"
      ]
    },
    {
      "title": "Stresses at A, B and C",
      "tex": [
        "\\sigma_A = K_{tgA}\\,\\sigma = {{KtgA}} \\times {{sigma}} = {{sigmaA}}\\ \\text{MPa}",
        "\\sigma_B = K_{tgB}\\,\\sigma = {{KtgB}} \\times {{sigma}} = {{sigmaB}}\\ \\text{MPa}",
        "\\sigma_C = K_{tgC}\\,\\sigma = {{KtgC}} \\times {{sigma}} = {{sigmaC}}\\ \\text{MPa}"
      ]
    },
    {
      "title": "Net stress on ligament A–B",
      "tex": [
        "\\sigma_{net} = \\frac{\\sigma\\sqrt{1 - x^2}}{1 - x} = \\frac{ {{sigma}}\\sqrt{1 - {{x}}^2} }{1 - {{x}}} = {{sigmaNet}}\\ \\text{MPa}"
      ]
    },
    {
      "title": "Net-section Kt",
      "tex": [
        "K_{tn} = \\frac{\\sigma_B}{\\sigma_{net}} = \\frac{ {{sigmaB}} }{ {{sigmaNet}} } = {{Ktn}}"
      ]
    },
    {
      "title": "Load carried by the ligament",
      "tex": [
        "P_{lig} = \\sigma\\,h\\,c\\,\\sqrt{1 - x^2} = {{sigma}} \\times {{h}} \\times {{c}} \\times \\sqrt{1 - {{x}}^2} = {{load}}\\ \\text{N}"
      ]
    },
    {
      "title": "Peak stress and factor of safety",
      "tex": [
        "\\sigma_{max} = \\max(\\sigma_B,\\ \\sigma_C) = {{sigmaMax}}\\ \\text{MPa (at {{crit}})}",
        "\\text{FoS} = \\frac{S_y}{\\sigma_{max}} = \\frac{ {{Sy}} }{ {{sigmaMax}} } = {{fos}}"
      ]
    },
    {
      "title": "Edge penalty vs an isolated hole",
      "tex": [
        "3\\sigma = 3 \\times {{sigma}} = {{sigmaIso}}\\ \\text{MPa}",
        "\\frac{\\sigma_{max} - 3\\sigma}{3\\sigma} = \\frac{ {{sigmaMax}} - {{sigmaIso}} }{ {{sigmaIso}} } = {{pct}}\\%"
      ]
    }
  ],
  "validation": [
    "Use a half model with a symmetry plane through the hole centre, normal to the load.",
    "Make the plate at least 10c long and wide so it behaves like a semi-infinite plate.",
    "Refine the mesh at B, at C and along ligament A–B.",
    "Probe the normal stress (in the load direction) at A, B and C and compare with σA, σB and σC here."
  ]
}$premium$::jsonb
from public.resources r
where r.slug = 'hole-near-edge-stress-concentration-calculator'
on conflict (resource_id) do nothing;

insert into public.resource_related (resource_id, related_id, relation)
select a.id, b.id, 'next_level'
from public.resources a, public.resources b
where a.slug = 'plate-with-hole-stress-concentration-calculator'
  and b.slug = 'hole-near-edge-stress-concentration-calculator'
on conflict do nothing;
