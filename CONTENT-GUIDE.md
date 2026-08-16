# Adding & Managing Content — CADseekho

How to add courses, categories, downloads, and blog posts, a year from now when
you've forgotten the details. Two ways to do it:

- **Admin Dashboard** (`/admin`) — no SQL, no file editing. Use this for one-off
  additions and edits. This is the intended, permanent way to manage content.
- **SQL via the Supabase SQL Editor** — faster for adding several courses at once
  with full syllabi, or for scripted/bulk content. This is how the original catalog
  and later additions (ANSYS, Creo) were loaded.

Both write to the same database — nothing about using one over the other locks you
out of the other later.

---

## Adding a new course

### Option A — Admin Dashboard (recommended for a single course)

1. If it's a genuinely new subject area (not AutoCAD/SolidWorks/ANSYS/Creo), create
   the category first: `/admin/categories` → **+ New Category**.
2. `/admin/courses` → **+ New Course**. Fill in the form and click **Save Course**.
   You must save once before the next two sections appear.
3. After saving, two new sections appear on the same page:
   - **Course Syllabus (Modules)** — add each module with a title, optional
     description, and order number (1, 2, 3…). This is what renders as "Course
     Syllabus" and "What You Will Learn" on the course page.
   - **Skills You Will Gain** — add short skill tags one at a time.
4. Toggle **Published** on when it's ready to go live. Toggle **Featured on
   homepage** only if you want it in the homepage's Featured Courses section.
5. Upload a **Course Image** — the existing course images all share the same
   design (white background, product render, "CATEGORY" + title baked into the
   bottom-left, orange accent line) at roughly 370×332px. Match that if you want
   visual consistency, though any image works — the card crops to a 10:9 box.

### Option B — SQL (recommended for adding several courses at once)

Create a new file in `supabase/migrations/`, named `YYYYMMDDHHMMSS_description.sql`
(the timestamp keeps files in chronological order — check the newest existing file
in that folder and pick a later timestamp). Use this as a template — it's the exact
pattern used for the ANSYS/Creo additions:

```sql
-- Add a new course under an existing category.
insert into public.courses (
  category_id, title, slug, short_description, description,
  level, software, prerequisites, format, is_featured, is_published
)
values (
  (select id from public.categories where slug = 'solidworks'), -- must already exist
  'Course Title Here',
  'course-title-here',                -- unique, lowercase, hyphenated — this becomes the URL
  'One-sentence summary shown on cards.',
  'Same or longer description shown on the course page.',
  'intermediate',                      -- 'beginner' | 'intermediate' | 'advanced' | null
  'SolidWorks',                        -- free text, shown in Course Information
  'Completion of X or equivalent working knowledge.',
  'self_paced',                        -- 'self_paced' | 'live'
  false,                               -- is_featured
  true                                 -- is_published — must be true to appear on the site
)
on conflict (slug) do nothing;          -- safe to re-run

-- Syllabus modules — order_number controls display order.
insert into public.course_modules (course_id, title, order_number)
select c.id, m.title, m.order_number
from public.courses c
join (
  values
    ('course-title-here', 'Module 1 Title', 1),
    ('course-title-here', 'Module 2 Title', 2),
    ('course-title-here', 'Module 3 Title', 3)
) as m (course_slug, title, order_number) on m.course_slug = c.slug
on conflict (course_id, order_number) do nothing;

-- Skill tags.
insert into public.course_skills (course_id, skill_name)
select c.id, s.skill_name
from public.courses c
join (
  values
    ('course-title-here', 'Skill One'),
    ('course-title-here', 'Skill Two')
) as s (course_slug, skill_name) on s.course_slug = c.slug
on conflict (course_id, skill_name) do nothing;
```

Then: Supabase Dashboard → **SQL Editor** → paste the whole file → **Run**. The
`on conflict do nothing` guards make it safe to re-run if something fails partway.

**To verify it worked**, refresh `/courses` on the site, or check directly (see
`TROUBLESHOOTING.md` for the throwaway-script pattern).

---

## Adding a new category

**Admin Dashboard**: `/admin/categories` → **+ New Category**. Fields: Name, Slug,
Description, Image URL (optional — falls back to a placeholder graphic), Display
Order (lower numbers show first), Active (must be checked to appear on the site). A
category with 0 published courses automatically shows "Coming Soon" — you don't
need to do anything special for that.

**SQL**:
```sql
insert into public.categories (name, slug, description, is_active, sort_order)
values ('Category Name', 'category-slug', 'Description text.', true, 5)
on conflict (slug) do nothing;
```

---

## Adding a Free Download resource

**Admin Dashboard only** (`/admin/downloads` → **+ New Resource**) — this one needs
an actual file upload, which isn't practical via SQL. Fields:

- **Requires login to download** — toggle this *before* uploading the file; it
  determines which storage bucket the file goes to (public vs. protected). If you
  change this toggle after uploading, re-upload the file so it lands in the right
  bucket.
- **Resource File** — the actual downloadable file (PDF/ZIP/DWG/DOCX/XLSX/etc).
- **Thumbnail** — optional preview image, always public regardless of the file's
  login requirement.
- **Published** — must be on to appear on `/downloads`.

---

## Adding a Blog post

**Admin Dashboard**: `/admin/blog` → **+ New Post**. Content is plain text — separate
paragraphs with a blank line between them (no markdown/HTML). Category must be one
of the fixed list (SolidWorks, AutoCAD, ANSYS, GD&T, DFM, CAD Tips, Engineering,
Career, Tutorials) — edit `CATEGORY_OPTIONS` in
`src/admin/Blog/AdminBlogPage.tsx` if you need to add a new one.

**SQL** (see `supabase/seed/blog_seed.sql` for a full working example):
```sql
insert into public.blog_posts (title, slug, excerpt, content, category, is_published, published_at)
values (
  'Post Title',
  'post-title-slug',
  'One-sentence excerpt shown on the blog listing.',
  'First paragraph.

Second paragraph — separated by a blank line, same as the admin form.',
  'AutoCAD',
  true,
  now()
)
on conflict (slug) do nothing;
```

---

## Editing or removing existing content

Everything above has matching **Edit** and **Delete** actions in its admin list page
(`/admin/categories`, `/admin/courses`, `/admin/downloads`, `/admin/blog`). Two
things worth knowing:

- **Deleting a category** fails if it still has courses attached (the database
  blocks it on purpose, so you can't accidentally orphan courses) — delete or
  reassign the courses first.
- **Unpublishing** (toggling Published off) is usually better than deleting — the
  content just stops showing on the site but isn't lost, and any existing course
  registrations/download history referencing it stay intact.

---

## Quick field reference

If you're writing SQL and need to remember exact column names, this is a summary —
`supabase/migrations/` is always the authoritative source if this drifts out of date.

**`categories`**: `name`, `slug` (unique), `description`, `image` (URL), `is_active`,
`sort_order` (int, lower = earlier)

**`courses`**: `category_id` (FK), `title`, `slug` (unique), `short_description`,
`description`, `level` (`beginner`/`intermediate`/`advanced`/null), `software`,
`prerequisites`, `image` (URL), `format` (`self_paced`/`live`), `is_featured`,
`is_published`

**`course_modules`**: `course_id` (FK), `title`, `description`, `order_number`
(unique per course)

**`course_skills`**: `course_id` (FK), `skill_name` (unique per course)

**`downloads`**: `title`, `slug` (unique), `description`, `category` (free text),
`file_path`, `file_type`, `file_size` (bytes), `thumbnail` (URL), `requires_login`,
`is_published`, `download_count` (auto-incremented, don't set manually)

**`blog_posts`**: `title`, `slug` (unique), `excerpt`, `content`, `featured_image`
(URL), `category`, `author_id` (FK, nullable), `is_published`, `published_at`

Every table above also has RLS: reads are public only when the relevant `is_*` flag
is true; all writes require an admin session — that's what the Admin Dashboard
authenticates as, and what SQL Editor access bypasses entirely (you're connected as
the database owner there, not subject to RLS).
