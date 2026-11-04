# Recorded-course player: deploy, Bunny setup, publishing, testing

Covers the `/learn/:course/:lesson` player, My Learning, progress and the Bunny
Stream integration. Code: `supabase/migrations/20261104090000_recorded_course_player.sql`,
`supabase/functions/{lesson-play-url,bunny-video,bunny-webhook}`, `src/pages/Learn/`.

## How access works (one rule)

`public.module_access(module, user)` in Postgres, wrapped by `public.lesson_access(lesson, user)`:

| Who | Can watch |
|---|---|
| Signed out | Nothing (sees titles + "Sign up free" on free lessons) |
| Signed in | Lessons in **free** modules (`course_modules.is_free`) |
| Enrolled (`course_registrations.status = 'enrolled'` and `expires_at` null or in the future) | Every lesson of that course |
| Admin | Everything, including unpublished lessons |

Also required: course published, module released, lesson published, and for videos `encode_status = 'ready'`.
The play URL, progress saving, downloads (storage RLS) and every lock icon (`course_outline`) use this rule.

Access period: `courses.access_days` (730 for Level 1, Level 2 and the Combo). Enrolling by any route
sets `expires_at`; buying again extends to whichever date is later. Combo payment enrolls Level 1 + Level 2.

## Deploy (production — run these yourself)

```sh
# 1. Database (also re-checks nothing else is pending)
npx supabase migration list
npx supabase db push            # applies 20261104090000_recorded_course_player.sql

# 2. Secrets (Bunny → Stream → your library)
npx supabase secrets set BUNNY_STREAM_LIBRARY_ID=<library id>                 # probably already set
npx supabase secrets set BUNNY_STREAM_TOKEN_KEY=<Security → Token authentication key>   # probably already set
npx supabase secrets set BUNNY_STREAM_API_KEY=<API → API key>
npx supabase secrets set BUNNY_WEBHOOK_SECRET=<API → Read-Only API key>

# 3. Functions
npx supabase functions deploy lesson-play-url
npx supabase functions deploy bunny-video
npx supabase functions deploy bunny-webhook --no-verify-jwt

# 4. Site: merge feature/recorded-course-player into main and push (your host builds from main).
```

Deploy order matters: push the migration **before** the functions and the site
(the new play function calls `lesson_access`, the site calls `course_outline`).

## Bunny settings the code expects

- **Token authentication: ON** (library → Security). Without it Bunny also plays unsigned URLs.
- **Allowed referrers / domains:** `cadseekho.com` (plus `localhost` while testing). The iframe sends
  `referrerpolicy="strict-origin-when-cross-origin"`.
- **Webhook URL:** `https://<project-ref>.supabase.co/functions/v1/bunny-webhook`
  (Bunny signs each call with the Read-Only API key; unsigned calls get 401).
- Embed host used: `player.mediadelivery.net` (current Bunny docs). Signed URLs last 3 hours.
- Optional: a second library (e.g. free lessons) — set `course_lesson_videos.library_id` for those videos.
  The token key must then be the same, or keep one library.

## How to publish a new lesson (admin)

1. **Bunny:** upload the video to the library. Copy its Video ID (or the embed URL).
2. **Admin → Courses → (course) → Lessons & videos.** If the lesson isn't listed yet, open
   **Add a lesson** under its module (code e.g. `M2.1`, title, type, minutes). It's added unpublished.
3. Paste the ID in the lesson's **Bunny video ID** box → **Save**. The status and length are fetched
   from Bunny straight away. While Bunny is still encoding it shows *Processing*; the webhook flips it
   to *Ready* when done (or press **Fetch from Bunny**).
4. Optional: open **Description** and add the lesson overview; upload files under **Downloads**
   and choose *Resources* or *Problems* tab.
5. Tick **Published**. Entitled learners see it on their next page load — no re-enrolment, no re-login.
6. New module: tick **Released** on the module first (and **Free** only for free-preview modules).
   Until then the module shows "Coming soon" with the optional note.

## Manual test script

Use Razorpay **test mode** keys while doing this.

1. Sign up a new test user (e.g. `you+t1@gmail.com`). Go to **My Learning** (header): a
   *Free preview* card for SOLIDWORKS Simulation with 0% and *Start: M0.1…*.
2. Open a free lesson (M1.1). It plays. Watch ~30 s, reload: it resumes. Open on your phone with the
   same account: it resumes there too. Seek to the end: the sidebar tick appears; My Learning % goes up.
3. Open a paid lesson (any lesson in Module 3+ once released). The sidebar shows a lock and the
   *Unlock* dialog appears with the founding price. *Back to free lessons* returns to the first free one.
4. Sign out and open the same free lesson URL: *Sign up free to watch*. Sign in → you land back on it.
5. With `salesOpen: true` in `sw-simulation.config.json` (or on a test deployment), buy Level 1 with a
   Razorpay test card. My Learning now shows *Enrolled · Access until <date + 2 years>*; the paid lesson plays.
   **Profile → Purchases** lists the order.
6. As admin, publish a new lesson (steps above). In the test user's open tab, reload the player: the
   lesson is there and playable. No sign-out needed.
7. Optional: in SQL set `expires_at = now() - interval '1 day'` for the test user's registration and
   reload: paid lessons lock again, free ones still play, My Learning says *Access expired · Renew access*.
8. Bunny webhook: upload a new video, paste its ID while it's still encoding (status *Processing*);
   when Bunny finishes, the admin row shows *Ready* without pressing anything.

## Not built (next steps)

- "New module released" emails (Resend is already used by `notify-registration`; needs an
  unsubscribe flag on profiles and batched sends).
- Uploading to Bunny straight from the admin page (TUS with a server-signed upload).
- Invoice PDFs (Purchases shows order id, date and amount; invoices are sent on request).
- The watermark sits over the page's player; in the player's own fullscreen mode it isn't visible.
- Q&A tab (hidden).
