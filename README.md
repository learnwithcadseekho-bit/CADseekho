# CADseekho

An online engineering CAD/CAE education platform — course catalog, free downloads, blog, user accounts, and an admin dashboard, built as a static React app on top of Supabase.

This is **not** an LMS. There are no live classes, video lectures, or quizzes (yet); priced courses take payment through Razorpay Checkout — see [Future Expansion](#future-expansion).

---

## 1. Project Overview

CADseekho presents CAD/engineering courses (AutoCAD, SolidWorks, with ANSYS and Teamcenter categories ready for future content), a login-gated free downloads library, a blog, user accounts with a simple dashboard, and an admin area for managing all of the above — all backed by a single Supabase project (Postgres + Auth + Storage), with Row Level Security as the actual access-control layer, not just app-side checks.

## 2. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, React Router 6, plain CSS (design tokens in `src/styles/tokens.css` — no CSS framework)
- **Backend**: Supabase (Postgres, Auth, Storage, Row Level Security). No custom auth system, no passwords stored outside Supabase Auth.
- **Deployment target**: static build → Vercel or Netlify, DNS for `cadseekho.com` pointed there from Hostinger.

## 3. Project Structure

```text
src/
  admin/         admin dashboard pages + admin-only services
  components/    shared UI (cards, buttons, form fields, layout chrome)
  context/       AuthContext (session/profile state)
  hooks/         useAuth, useActiveCategories, etc.
  layouts/       MainLayout (Header + Outlet + Footer)
  lib/           supabaseClient.ts
  pages/         public-facing route pages
  routes/        AppRoutes.tsx (all route definitions)
  services/      one file per table/domain, wraps every Supabase call
  styles/        tokens.css, global.css, and shared page-level CSS
  types/         TypeScript types mirroring the DB schema
supabase/
  migrations/    numbered SQL migrations, apply in order
  seed/          seed data (courses, sample blog posts)
  config.toml    local Supabase CLI config (optional, for local dev)
scripts/
  prerender.mjs   build-time prerender: real HTML per public page + sitemap.xml
  serve-dist.mjs  local preview of dist/ with Vercel-style routing (npm run preview)
```

## 4. Installation

Requires Node.js 20+ (built and tested on Node 22).

```bash
npm install
```

## 5. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase project's public URL and anon key (**Project Settings → API** in the Supabase dashboard):

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

These are safe to expose in the built frontend — they're the public anon key, not a secret. **Never** put the service-role key in this file or in any `VITE_`-prefixed variable; those get inlined into the client bundle at build time.

`VITE_SITE_URL` is optional and only used by the sitemap generator at build time (defaults to `https://cadseekho.com`).

## 6. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Grab the Project URL and anon key from **Project Settings → API** and put them in `.env` (step 5).
3. Apply the database schema — see below.

### Database Migration

Run these files **in order** via the Supabase dashboard's **SQL Editor** (paste each file's contents, click Run):

1. `supabase/migrations/20260816120000_initial_schema.sql` — tables
2. `supabase/migrations/20260816120100_functions_and_triggers.sql` — triggers (auto-create profile on signup, admin-role guard, download counter)
3. `supabase/migrations/20260816120200_rls_policies.sql` — Row Level Security policies
4. `supabase/migrations/20260816120300_storage_buckets.sql` — storage buckets + policies
5. `supabase/migrations/20260816120400_downloads_protected_authenticated_read.sql` — lets logged-in users fetch protected downloads

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) and a linked project, `supabase db push` applies all migrations in `supabase/migrations/` automatically instead.

### Seed Data

After the migrations, run these (also via SQL Editor, or automatically if using the CLI — `config.toml` already points at both):

- `supabase/seed/seed.sql` — the 4 categories + 7 courses + modules + skills from the spec
- `supabase/seed/blog_seed.sql` — 3 sample blog articles

Both are safe to re-run (guarded with `on conflict do nothing`).

### Creating an Admin User

There's no admin signup flow by design — every new signup gets `role = 'user'`. To promote your first admin:

1. Sign up for a normal account through the site (`/signup`).
2. In the Supabase SQL Editor, run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Log out and back in (or just refresh) — `/admin` is now accessible.

From then on, use **Admin → Users → Make Admin** in the dashboard to promote anyone else.

### Enabling "Continue with Google" Sign-In

The Login/Signup pages already have a Google sign-in button wired up in code, but it
won't work until you configure a Google OAuth client and connect it in Supabase —
this can't be done from code, only from the Google Cloud Console and Supabase
dashboard:

1. **Google Cloud Console** → create (or pick) a project → **APIs & Services →
   Credentials** → **Create Credentials → OAuth client ID** → Application type
   **Web application**.
2. Under **Authorized redirect URIs**, add:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (find `<your-project-ref>` in your Supabase project URL — it's the same value
   as the subdomain in `VITE_SUPABASE_URL`).
3. Copy the generated **Client ID** and **Client Secret**.
4. **Supabase Dashboard** → **Authentication → Providers → Google** → toggle it on
   → paste in the Client ID and Client Secret → **Save**.
5. That's it — no code or redeploy needed. The button on `/login` and `/signup`
   will start working immediately once the provider is saved.

Until this is configured, clicking the button shows a friendly "Google sign-in
isn't available right now" message rather than a raw error — it fails safely.

### Uploading Files

The admin dashboard (`/admin/courses`, `/admin/downloads`, `/admin/blog`) has file upload fields built in — course/category/blog images go to public storage buckets and get stored as public URLs; download resource files go to `downloads-public` or `downloads-protected` depending on the "Requires login" toggle, and are stored as a file path (protected files are never given a permanent public URL — the app mints a short-lived signed URL on demand).

No manual Storage dashboard work is required for normal content management.

For a full walkthrough of adding courses, categories, downloads, and blog posts
(including the SQL pattern for bulk additions), see
[CONTENT-GUIDE.md](./CONTENT-GUIDE.md).

## 7. Running Locally

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## 8. Deployment

### How pages are built (SEO)

Every public page is **prerendered at build time** into its own HTML file, so
search engines get the real content, title, description, canonical and JSON-LD
without running JavaScript; React then hydrates that HTML in the browser.

`npm run build` runs, in order:

1. `tsc -b` — type check.
2. `vite build` — the browser bundle → `dist/`.
3. `vite build --ssr src/entry-server.tsx` — the build-time renderer → `dist-ssr/` (never deployed).
4. `npm run build:seo` (`scripts/prerender.mjs`) — fetches every published course,
   category, blog post and resource from Supabase, renders each public URL, and writes:
   - `dist/<path>/index.html` for every public page (`dist/index.html` is the home page),
   - `dist/404.html` (served with a real 404 status for unknown URLs),
   - `dist/app.html` (plain shell, `noindex`, for login/signup/dashboard/admin/classroom),
   - `dist/sitemap.xml` (only indexable, canonical, 200 pages, with `<lastmod>`).

The prerender **fails the build** rather than ship a broken page: on a Supabase fetch
error, a public URL that renders as "not found", a non-canonical slug (anything not
lowercase-hyphenated), invalid JSON-LD, or a legacy redirect missing from a host config.
Title/description length and H1 problems are printed as warnings.

**After publishing or editing a blog post, course or resource**, the live site
keeps serving the old HTML until you rebuild. On Vercel, trigger a redeploy
(Deployments → ⋯ → Redeploy, or push any commit). Locally you can regenerate just
the pages and sitemap without rebuilding the JS: `npm run build:seo`. Tip: a Vercel
**Deploy Hook** (Project → Settings → Git → Deploy Hooks) gives you a URL you can open
after publishing to rebuild automatically.

Preview the production build locally with real routing (redirects, 404 status,
trailing-slash rules) with `npm run preview` → `http://localhost:4173`.
(`vite preview` isn't suitable: it answers unknown URLs with the home page and a 200.)

Optional build-time env vars (in `.env` locally, and in the Vercel dashboard):
`VITE_SITE_URL` (canonical origin, default `https://cadseekho.com`),
`VITE_GSC_VERIFICATION` (Google Search Console HTML-tag token) and `VITE_GA4_ID`
(Google Analytics 4 measurement ID, e.g. `G-XXXXXXX`).

### Vercel (current host)

1. Connect the Git repository. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and the optional vars above) as environment variables.
3. `vercel.json` already has the 301 redirects for old URLs, `trailingSlash: false`,
   the app-shell rewrites for client-only routes and long caching for `/assets`.
   There is deliberately **no** catch-all rewrite to `index.html` any more — unknown
   URLs must 404.
4. **Domains:** in Project → Settings → Domains, make `cadseekho.com` the primary
   domain and set `www.cadseekho.com` to *Redirect to cadseekho.com (301/308)*.
   Canonical URLs use the bare domain; Vercel handles http → https itself.

### Connecting `cadseekho.com` via Hostinger DNS

1. In Vercel/Netlify, add `cadseekho.com` (and `www.cadseekho.com`) as a custom domain — the platform will show you DNS records to add.
2. In Hostinger's DNS zone editor for the domain, add the records the platform gave you (typically an `A` record pointing at their IP, or a `CNAME` for the `www` subdomain).
3. Wait for DNS propagation (usually minutes, can take up to 24-48 hours), then verify in the hosting platform's domain settings.

### Alternative: hosting directly on Hostinger

If you have an actual Hostinger hosting plan (not just the domain), you can upload
the static build directly instead of using Vercel:

1. `npm run build` locally (reads your `.env` — the Supabase URL/anon key are public
   values, safe to embed in the build).
2. Upload everything **inside** `dist/` (not the folder itself) to `public_html` via
   hPanel → **File Manager** (zip locally, upload, extract) or FTP (hPanel → **FTP
   Accounts**). Clear out any existing placeholder content in `public_html` first.
   Don't upload `dist-ssr/`.
3. hPanel → **SSL** → enable the free Let's Encrypt certificate if not already on.
4. `public/.htaccess` (copied into `dist/`) handles: 301s for old URLs, www → non-www
   and http → https in one hop, trailing slash removal, serving `/path` from
   `/path/index.html`, the app shell for login/dashboard/admin, and a real 404 with
   `404.html`. Make sure it made it into `public_html` (File Manager hides dotfiles by
   default). Check with `curl -I https://cadseekho.com/blog/Deep%20Holes` (expect 301)
   and `curl -I https://cadseekho.com/no-such-page` (expect 404).
5. There's no auto-deploy this way — repeat steps 1–2 after every code or content
   change. If your plan includes hPanel → **Advanced → Git**, that can automate
   deploys on push instead.

Netlify works too: `public/_redirects` mirrors the same redirects and rewrites.

## 9. Troubleshooting

For deeper diagnostic techniques (how to check if the dev server is serving stale
code, how to verify RLS behavior directly, how to audit for undefined CSS tokens,
etc.), see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md). The quick fixes below cover
the most common setup issues.

**Blank page / "Missing Supabase environment variables" error**
`.env` is missing or incomplete. Copy `.env.example` to `.env` and fill in real values, then restart `npm run dev`.

**Signup works but the profile never appears / "Welcome, undefined"**
The `handle_new_user` trigger from migration 2 didn't get applied. Re-run migrations 1–3 in order in the SQL Editor.

**Course/category pages show "temporarily unavailable" or stay empty**
Either the migrations or the seed data haven't been run yet — see [Database Migration](#database-migration) and [Seed Data](#seed-data).

**Can't log into `/admin` even as a real user**
Every account defaults to `role = 'user'`. See [Creating an Admin User](#creating-an-admin-user).

**Downloads fail with a permission error**
Confirm migration 5 (`20260816120400_...`) has been applied — it's what allows logged-in users to fetch protected files.

**Uploaded images/files don't show up**
Storage buckets are created by migration 4. If uploads fail with a bucket-not-found error, re-run that migration.

---

## Future Expansion

Deliberately not built yet, but the schema and architecture support adding: paid courses, Razorpay/Stripe, video lessons, quizzes, certificates, instructor accounts, and course completion tracking.
