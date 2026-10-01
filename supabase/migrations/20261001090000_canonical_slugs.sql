-- SEO: canonical, lowercase-hyphenated slugs (no spaces, correct spelling),
-- merge the duplicate deep-hole-drilling post, and stop bad slugs coming back.
-- The old URLs 301-redirect to the new ones (public/.htaccess, vercel.json,
-- public/_redirects). Run this BEFORE deploying the prerendered build: the
-- build fails while any published slug is non-canonical.

begin;

-- 1. Course: "Solidworks Simulation for Begginner" → solidworks-simulation-for-beginners
update public.courses
set slug = 'solidworks-simulation-for-beginners'
where slug = 'Solidworks Simulation for Begginner';

-- 2. Duplicate post: "Deep Holes" is a newer upload of the same article as
--    deep-hole-drilling-design-guide. Keep the canonical slug, point it at the
--    newer, longer file (adds the worked drawing example), and unpublish the
--    duplicate row (kept, not deleted, so nothing is lost).
update public.blog_posts as canonical
set custom_html_url = dup.custom_html_url,
    updated_at = now()
from public.blog_posts as dup
where canonical.slug = 'deep-hole-drilling-design-guide'
  and dup.slug = 'Deep Holes'
  and dup.custom_html_url is not null;

update public.blog_posts
set is_published = false,
    slug = 'deep-holes-duplicate',
    updated_at = now()
where slug = 'Deep Holes';

-- 3. Post: "Stress Concentration" → stress-concentration-factor
update public.blog_posts
set slug = 'stress-concentration-factor',
    updated_at = now()
where slug = 'Stress Concentration';

-- 4. Guard rails: only lowercase letters, digits and single hyphens from now on.
--    (NOT VALID skips re-checking existing rows; all current rows are fixed above.)
alter table public.courses
  add constraint courses_slug_canonical check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;
alter table public.blog_posts
  add constraint blog_posts_slug_canonical check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;
alter table public.categories
  add constraint categories_slug_canonical check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;

commit;
