# CADseekho Troubleshooting Guide

A self-serve guide for diagnosing issues in this project without guessing. Most bugs
here fall into one of four buckets — work through them in this order:

1. **Is the dev server actually serving my latest code?** (see [Stale dev server](#stale-dev-server-shows-old-codestyles))
2. **Is the database missing a migration or seed file?** (see [Empty pages](#pages-show-empty-loading-or-temporarily-unavailable))
3. **Is Row Level Security blocking something it shouldn't (or allowing something it shouldn't)?** (see [Checking RLS directly](#checking-rls-directly))
4. **Is it a genuine CSS/layout bug?** (see [Layout & card issues](#layout--card-grid-issues))

Don't guess from a screenshot alone — verify against the running server and the live
database first. That's what caught every real bug in this section.

---

## Stale dev server shows old code/styles

**Symptom**: you edit a file, refresh the browser (even in incognito), and nothing
changes — or the change is inconsistent between similar files.

**Cause**: Vite's dev server watches files on disk and hot-reloads on change, but its
file watcher can occasionally lose track of a file — this happened in this project
after using `sed -i` to bulk-edit CSS, since in-place `sed` edits do a rename-under-
the-hood that can confuse the watcher on Windows. The server then keeps serving a
cached version of that one file while every other file updates normally.

**How to confirm it (don't guess — check)**: fetch the file straight from the dev
server and compare it to what's on disk.

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
$r = Invoke-WebRequest -Uri "http://localhost:5173/src/styles/cards.css" -UseBasicParsing
$r.Content   # compare this against the actual file contents
```

If they differ, that's the bug — not your code, not the browser.

**Fix**: restart the dev server. Kill the running `npm run dev` process and start it
again; this forces a fresh read of every file from disk.

**Prevention**: prefer the `Edit` tool (or hand-editing) over `sed -i` for CSS/config
files in this project. If you do use `sed -i`, restart the dev server afterward just
in case.

---

## Pages show empty, "Loading…", or "temporarily unavailable"

**Cause**: almost always a missing migration or seed file, not a code bug. Every
public page fails gracefully (empty/error state) rather than crashing when its
underlying table doesn't have the expected data or column yet.

**How to confirm**: query the table directly with the anon key and see what comes
back. Save this as a throwaway script, run it, then delete it:

```js
// verify.mjs
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await supabase.from("courses").select("*").limit(5);
console.log(error ? `ERROR: ${error.message}` : JSON.stringify(data, null, 2));
```

```powershell
node --env-file=.env verify.mjs
```

- If `error` mentions a column/table that "does not exist" → a migration hasn't been
  run yet. Check `supabase/migrations/` for files you haven't applied (they're
  numbered — apply in order via the Supabase SQL Editor).
- If it returns `[]` with no error → the table is empty. Check `supabase/seed/` for
  seed files you haven't run.

**Quick reference — what's been added over time** (check `supabase/migrations/` for
the current full list, this won't stay up to date):
- `20260816120000`–`20260816120300`: initial schema, triggers, RLS, storage buckets
- `20260816120400`: lets logged-in users fetch protected downloads
- `20260817090000`: removed Teamcenter, added ANSYS Workbench L1/L2 + Creo Mechanism
- `20260817100000`: added `courses.format` and `categories.sort_order`

---

## Can't access `/admin` as a real user

Every new signup defaults to `role = 'user'` — there's no admin signup flow by
design. Promote yourself via the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Then refresh the site (or log out/in). The "Admin" link in the header only shows for
`role = 'admin'`.

---

## Checking RLS directly

If something feels like a permissions bug (data visible that shouldn't be, or an
admin action silently failing), don't trust `error === null` alone — Postgres RLS
silently filters rows rather than throwing, so an "successful" write can still have
affected zero rows. Always check before/after state:

```js
// verify-rls.mjs
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data: before } = await supabase.from("categories").select("name").eq("slug", "autocad").single();
const { error } = await supabase.from("categories").update({ name: "test" }).eq("slug", "autocad");
const { data: after } = await supabase.from("categories").select("name").eq("slug", "autocad").single();

console.log("error:", error?.message ?? null);
console.log("changed:", before.name !== after.name); // should be false for anon
```

Run with `node --env-file=.env verify-rls.mjs`, then delete the script.

---

## Layout & card grid issues

**Card widths inconsistent across pages with different item counts** — the category/
course/download/blog grids intentionally use `grid-template-columns: repeat(auto-fill,
minmax(Npx, 1fr))`, **not** `auto-fit`. `auto-fill` keeps a fixed number of same-size
tracks regardless of how many items exist (a category with 1 course just leaves empty
grid cells); `auto-fit` collapses empty tracks and stretches the remaining items to
fill the row, causing exactly this bug. If this regresses, check `src/styles/cards.css`,
`src/pages/Blog/blog.css`, `src/pages/Downloads/downloads.css`.

**Images look cropped or show a visible seam/border** — the card image containers use
a fixed `aspect-ratio: 10 / 9` with `object-fit: cover`, matching the convention
established by the current course-image graphics (~370×332px, ratio ≈1.11–1.12). If
you introduce images with a very different aspect ratio (e.g. tall portrait photos),
either crop them to roughly match before uploading, or expect `cover` to crop them
to fill the box.

**Text touching the card border with no padding** — check that every CSS custom
property referenced with `var(--space-N)` actually exists in `src/styles/tokens.css`.
The scale is `--space-N = N × 0.25rem` for whichever `N` values are defined; an
undefined one (this happened with `--space-5` and `--space-10`) silently computes to
`0` rather than erroring, so it's easy to miss. To audit the whole codebase at once:

```bash
grep -rohE -- 'var\(--[a-z0-9-]+' src -r | sed 's/var(//' | sort -u > used.txt
grep -ohE -- '--[a-z0-9-]+:' src/styles/tokens.css | sed 's/://' | sort -u > defined.txt
comm -23 used.txt defined.txt   # anything printed here is used but never defined
```

**Footer/CTA row not aligned to the bottom of the card** — cards are flex columns
with the body set to `flex: 1` and the footer given `margin-top: auto`, so it's
pinned to the bottom regardless of how many lines the description takes. If a new
card type doesn't follow this pattern, its footer will drift with content length.

---

## General diagnostic checklist

Before changing any code, run these three (from the project root):

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
npx tsc -b --noEmit   # type errors
npx eslint .          # lint errors
npm run build         # full production build — catches issues dev mode can hide
```

All three should produce no output (clean) before you consider a fix complete.

For anything involving live data, don't trust the UI alone — write a 10-line
throwaway Node script against the anon key (as shown above) to see exactly what the
database returns, then delete the script. This was the fastest path to the actual
root cause for every non-trivial bug in this build.
