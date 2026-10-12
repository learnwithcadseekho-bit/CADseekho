# ANSYS Foundation launch — manual QA checklist

Do this on the live site (www.cadseekho.com) after deploying, on a phone and on
desktop. Tick each box. Do the real test lead and the test payment last.

## 0. Before you start

- [ ] Migration `20261012090000_leads.sql` pushed, `submit-lead` function deployed, secrets set (see the deploy steps in the PR/hand-off).
- [ ] Vercel env vars set: `VITE_META_PIXEL_ID`, `VITE_GA4_ID`, optional `VITE_GOOGLE_ADS_ID` + labels, optional `VITE_META_DOMAIN_VERIFICATION`. Redeploy after changing any `VITE_` var — they're baked in at build time.
- [ ] `public/media/ad-4x5.mp4` and `public/media/ad-4x5-poster.jpg` exist (poster = a 1080×1350 still from the video).
- [ ] GA4 → Admin → Data streams → (web stream) → Enhanced measurement → gear → **turn OFF "Page changes based on browser history events"**. The site sends its own page views per route change; leaving this on double-counts.
- [ ] Install the Chrome extensions **Meta Pixel Helper** and **Tag Assistant Companion**.

## 1. Pages render

- [ ] `/ansys-foundation` — hero, chips, video plays muted on loop (after load), countdown ticks, 5 topic cards, schedule shows "No class — Dussehra", testimonials, price ₹1,999, FAQ opens, sticky bar on mobile only.
- [ ] At 360 px wide (Chrome DevTools → device toolbar): no sideways scrolling; hero buttons visible without scrolling.
- [ ] Countdown: change your computer's timezone to e.g. London — the countdown still targets 8 PM IST.
- [ ] `/courses/ansys-workbench-level-1` shows the dark banner linking to `/ansys-foundation`.
- [ ] Footer has Privacy policy and Refund policy links; both pages open.
- [ ] View source of `/thank-you` → contains `<meta name="robots" content="noindex, follow">`.
- [ ] `/sitemap.xml` lists `/ansys-foundation` and `/privacy-policy`; not `/thank-you`.
- [ ] Google Rich Results Test on `https://cadseekho.com/ansys-foundation` → Course and FAQ detected, no errors.

## 2. Meta Pixel Helper

- [ ] Land on `/ansys-foundation` → **PageView** and **ViewContent** (value 1999 INR). Exactly one PageView.
- [ ] Click to another page and back → one PageView per navigation, no duplicates.
- [ ] Click **WhatsApp us** (and the sticky WhatsApp icon) → **Contact**.
- [ ] Submit the demo form → on `/thank-you`: **Lead** (content_name "ANSYS Foundation demo") with an event ID. The URL no longer has `?lead=1`.
- [ ] Refresh `/thank-you` → **no** second Lead.
- [ ] Open `/thank-you?lead=1` directly in a new tab → **no** Lead (nothing was submitted).
- [ ] `/login`, `/dashboard`, `/admin` → Pixel Helper shows no pixel.

## 3. Meta Events Manager → Test events

- [ ] Enter `https://www.cadseekho.com/ansys-foundation`, open it from there, repeat section 2 — events appear in the Test events tab.
- [ ] Lead shows "Advanced matching parameters: em, ph" when email and phone were filled in.
- [ ] Settings → domain `cadseekho.com` shows as verified (if you set `VITE_META_DOMAIN_VERIFICATION`).

## 4. GA4 Realtime and DebugView

- [ ] Connect Tag Assistant (section 5) — that turns on debug mode — then open GA4 → Admin → DebugView.
- [ ] Events: `page_view` (one per page), `view_item`, `contact` (method whatsapp), `generate_lead` (method website_form), `begin_checkout`, `purchase` (with transaction_id).
- [ ] Realtime shows your visit with the UTM source when you open `/ansys-foundation?utm_source=test&utm_medium=qa&utm_campaign=launch_qa`.
- [ ] Mark `generate_lead` and `purchase` as **key events** (Admin → Events).

## 5. Google Tag Assistant (tagassistant.google.com)

- [ ] Connect to `https://www.cadseekho.com/ansys-foundation` → GA4 tag (G-…) and Google Ads tag (AW-…, if set) fire once each.
- [ ] Demo form submit → Google Ads **conversion** event with your Lead label on `/thank-you`.
- [ ] If you import conversions from GA4 instead of using labels, leave the label env vars empty and check the import in Google Ads → Goals.

## 6. One real test lead

Open `/ansys-foundation?utm_source=qa&utm_campaign=launch_qa&utm_content=test` and book with your own number.

- [ ] Wrong number (e.g. `12345`) shows an inline error; unticked consent shows an error.
- [ ] Valid booking → redirected to `/thank-you`.
- [ ] `/admin/leads` → the lead is there with the phone as `+91XXXXXXXXXX`, role, CAD, campaign `launch_qa`.
- [ ] The Google Sheet has a new row within a few seconds (Timestamp in IST).
- [ ] Email to info@cadseekho.com and/or Telegram message arrived, with a working "WhatsApp" link.
- [ ] Book again with the same number → still one lead in `/admin/leads`, "booked 2×"; the Sheet row is updated, not duplicated.
- [ ] Toggle Attended / Paid and add a note → refresh → saved. Export CSV opens in Excel.
- [ ] Add to Google Calendar on `/thank-you` → event on Sat 17 Oct, 8:00 PM IST.
- [ ] Delete the test lead afterwards (Supabase → Table editor → leads) and the Sheet row.

## 7. One test payment (Razorpay test mode)

Only with `rzp_test_` keys set (`supabase secrets set RAZORPAY_KEY_ID=rzp_test_… RAZORPAY_KEY_SECRET=…`), and then switch back to live keys.

- [ ] Sign in with a test account whose email or phone matches a test lead.
- [ ] `/ansys-foundation` → **Pay & enroll** → login if asked → Razorpay opens: **InitiateCheckout** / `begin_checkout`.
- [ ] Pay with a Razorpay test card/UPI → "✓ Enrolled": **Purchase** (value 1999, INR, event ID = Razorpay payment id) / GA4 `purchase` / Ads purchase conversion — once.
- [ ] Refresh the course page → no second Purchase.
- [ ] `/admin/leads` → that lead now shows Paid ✓ and status Paid.
- [ ] Switch Razorpay keys back to `rzp_live_` and confirm a real checkout opens (don't pay).

## 8. Before the offer ends (Sun 18 Oct, 11:59 PM IST)

- [ ] The ₹1,999 charged at checkout comes from the course's price in the admin, not from the landing page. Change the course price in `/admin/courses` when the offer ends, and update `price` / `offerEnds` in `src/content/launch.ts`.
