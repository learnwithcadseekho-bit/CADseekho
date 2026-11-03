# SOLIDWORKS Simulation launch — runbook

Pages: Level 1 `/courses/solidworks-simulation`, Level 2 `/courses/solidworks-simulation-level-2`
(both from `src/pages/SwSimulation/SwSimCourse.tsx`), homepage feature
`src/pages/Home/SwSimPromoSection.tsx`, three cards on `/courses`
(`src/pages/Courses/SwSimCards.tsx`). Free lessons (Modules 0, 1, 2) at
`/classroom/solidworks-simulation/<code>` (e.g. `M1.1`).

The old live course `/courses/solidworks-simulation-for-beginners` now 301s to Level 1
(`src/content/legacyRedirects.ts` + vercel.json / .htaccess / _redirects). Its database
row is untouched, so anyone enrolled keeps their dashboard and classroom access; it's
only hidden from listings and the sitemap.

Still to fill in `sw-simulation.config.json`: `accessPeriod` (e.g. "12 months" — the
"How long do I have access?" FAQ appears once set) and `level2Launch` (e.g. "February 2027").

## Single source of truth

| What | Where |
|---|---|
| Prices, `salesOpen`, active tier, free modules | `supabase/functions/_shared/sw-simulation.config.json` (read by the page **and** `create-razorpay-order`) |
| Page copy, syllabus, FAQ | `src/content/swSimulation.ts` |
| Course/module/lesson rows | `supabase/migrations/20261103090200_sw_simulation_seed.sql` (test fails if it drifts from the content file) |
| Who may watch / download | `public.module_access()` in `20261103090000_course_lessons_and_access.sql` |

Changing a price or opening sales = edit the config JSON, then **redeploy the site and
`create-razorpay-order`** (both bundle the file).

## Go-live steps

1. Apply migrations (staging first): `npx supabase db push`
   — `20261103090000_course_lessons_and_access.sql`, `20261103090100_leads_course_notify.sql`,
   `20261103090200_sw_simulation_seed.sql`. The seed is idempotent; re-running changes nothing.
2. Bunny Stream: library → Security → enable **Token Authentication** (and allowed domain
   `cadseekho.com`). Then:
   ```
   npx supabase secrets set BUNNY_STREAM_LIBRARY_ID=<library id> BUNNY_STREAM_TOKEN_KEY=<token auth key>
   npx supabase functions deploy lesson-play-url
   npx supabase functions deploy submit-lead
   npx supabase functions deploy create-razorpay-order
   ```
3. Google Sheet: paste the updated `scripts/google-sheet-webhook.gs` into Apps Script and
   publish a **new version** (otherwise a waitlist signup can overwrite a demo booking row
   with the same phone).
4. Per lesson: Admin → Courses → "SOLIDWORKS Simulation — Level 1" → **Lessons & videos** →
   paste the Bunny video ID (or embed URL) → Save → tick Published.
5. Downloads: same panel → Downloads → upload `L1M1_Start_Files.zip`, `L1_M1_Slides.pdf`,
   `Validation_Sheet_Template.xlsx` (same file names replace the seeded rows). `*_Test*` /
   `*_Solved*` files are refused by the database.
6. Build + deploy the site (`npm run build`, then the usual deploy).

## Opening sales

Set `"salesOpen": true` in the config, redeploy site + `create-razorpay-order`. Razorpay
needs no products — orders are created per purchase. Combo purchases enroll into Level 1 and
Level 2 via `mark_payment_paid`. Founding-batch seat count (50) is **not enforced**; switch
`activePriceTier` to `"launch"` by hand when the seats are gone.

## Releasing a paid module

Admin → Lessons & videos → tick **Released** on the module, add its lessons' videos, publish.
New lessons for M2–M7 need rows in `course_lessons` (add a follow-up seed migration in the same
style, and the same entries in `src/content/swSimulation.ts`).
