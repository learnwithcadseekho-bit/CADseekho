-- First Resources hub calculator (spec 6A): plate with a central hole.
-- The component is src/calculators/KtPlateCenterHole.tsx (component_key
-- 'kt-plate-center-hole'). Hand-calc step templates, chart flag and the
-- validation guide live in resource_premium, readable only by members.
-- Idempotent: re-running leaves an existing row (and admin edits) alone.

insert into public.resources
  (slug, title, summary, body, type, level, access, required_entitlement,
   component_key, component_props, course_cta, status)
values (
  'plate-with-hole-stress-concentration-calculator',
  'Plate with a Hole — Stress Concentration (Kt) Calculator',
  'Get Kt, the peak stress at the hole and a safe/marginal/yields verdict for a plate with a central hole in tension — then check the full hand calculation.',
  $body$<p>A hole in a plate under tension doesn't just remove material — it concentrates stress at the hole edge. This calculator gives you the stress concentration factor Kt for a plate of finite width, the peak stress, and whether the plate stays elastic.</p><h2>How to use it</h2><ul><li>Enter the plate width W, hole diameter d, thickness t and the axial load P.</li><li>Pick a material, or choose Custom and enter the yield strength.</li><li>Results update as you type. Units are mm, N and MPa.</li></ul><p>Solve it by hand first, then validate the same plate in ANSYS or SolidWorks Simulation.</p>$body$,
  'calculator', 'intermediate', 'partial', 'member',
  'kt-plate-center-hole',
  '{"validation_teaser": "Model a quarter plate with two symmetry planes."}'::jsonb,
  '{"label": "Validate it properly — ANSYS courses →", "url": "/courses/category/ansys"}'::jsonb,
  'published'
)
on conflict (slug) do nothing;

insert into public.resource_software (resource_id, software_id)
select r.id, s.id
from public.resources r
join public.software s on s.slug in ('general', 'ansys', 'solidworks-simulation')
where r.slug = 'plate-with-hole-stress-concentration-calculator'
on conflict do nothing;

insert into public.resource_topics (resource_id, topic_id)
select r.id, t.id
from public.resources r
join public.topics t on t.slug in ('stress-concentration', 'materials')
where r.slug = 'plate-with-hole-stress-concentration-calculator'
on conflict do nothing;

insert into public.resource_premium (resource_id, payload)
select r.id, $premium${
  "charts": true,
  "steps": [
    {
      "title": "Geometry ratio",
      "tex": [
        "\\frac{d}{W} = \\frac{ {{d}} }{ {{W}} } = {{ratio}}"
      ]
    },
    {
      "title": "Gross and net areas",
      "tex": [
        "A_g = W\\,t = {{W}} \\times {{t}} = {{Ag}}\\ \\text{mm}^2",
        "A_n = (W - d)\\,t = ({{W}} - {{d}}) \\times {{t}} = {{An}}\\ \\text{mm}^2"
      ]
    },
    {
      "title": "Nominal stresses",
      "tex": [
        "\\sigma_g = \\frac{P}{A_g} = \\frac{ {{P}} }{ {{Ag}} } = {{sigmaG}}\\ \\text{MPa}",
        "\\sigma_n = \\frac{P}{A_n} = \\frac{ {{P}} }{ {{An}} } = {{sigmaN}}\\ \\text{MPa}"
      ]
    },
    {
      "title": "Net-section Kt (Peterson Eq. 4.1)",
      "tex": [
        "K_{tn} = 2 + 0.284\\left(1 - \\frac{d}{W}\\right) - 0.600\\left(1 - \\frac{d}{W}\\right)^2 + 1.32\\left(1 - \\frac{d}{W}\\right)^3",
        "K_{tn} = 2 + 0.284({{u}}) - 0.600({{u}})^2 + 1.32({{u}})^3 = {{Ktn}}"
      ]
    },
    {
      "title": "Gross-section Kt",
      "tex": [
        "K_{tg} = \\frac{K_{tn}}{1 - \\frac{d}{W}} = \\frac{ {{Ktn}} }{ {{u}} } = {{Ktg}}"
      ]
    },
    {
      "title": "Peak stress at the hole edge",
      "tex": [
        "\\sigma_{max} = K_{tn}\\,\\sigma_n = {{Ktn}} \\times {{sigmaN}} = {{sigmaMax}}\\ \\text{MPa}",
        "\\text{Check: } K_{tg}\\,\\sigma_g = {{Ktg}} \\times {{sigmaG}} = {{sigmaMaxCheck}}\\ \\text{MPa}"
      ]
    },
    {
      "title": "Factor of safety",
      "tex": [
        "\\text{FoS} = \\frac{S_y}{\\sigma_{max}} = \\frac{ {{Sy}} }{ {{sigmaMax}} } = {{fos}}"
      ]
    },
    {
      "title": "Compare with an infinite plate",
      "tex": [
        "\\sigma_{\\infty} = 3\\,\\sigma_g = 3 \\times {{sigmaG}} = {{sigmaInf}}\\ \\text{MPa}",
        "\\frac{\\sigma_{max} - \\sigma_{\\infty}}{\\sigma_{\\infty}} = \\frac{ {{sigmaMax}} - {{sigmaInf}} }{ {{sigmaInf}} } = {{pct}}\\%"
      ]
    }
  ],
  "validation": [
    "Model a quarter plate with two symmetry planes.",
    "Put at least 12 elements on the quarter arc of the hole.",
    "Probe σy (the stress in the load direction) at the hole edge, on the net section.",
    "After mesh convergence, expect the result within about 2–3% of σmax from this calculator."
  ]
}$premium$::jsonb
from public.resources r
where r.slug = 'plate-with-hole-stress-concentration-calculator'
on conflict (resource_id) do nothing;
