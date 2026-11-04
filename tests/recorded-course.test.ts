// Recorded-course player: access expiry, the one access rule
// (module_access → lesson_access), course_outline lock states, progress,
// My Learning, purchases, Combo enrollment, the play endpoint and the Bunny
// webhook. Runs the real migrations in PGlite. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { createTestDb, read, type TestDb } from "./fixtures/db.ts";
import { DEFAULT_TTL_SECONDS, handlePlay, signBunnyEmbedUrl, type PlayDeps } from "../supabase/functions/lesson-play-url/play.ts";
import {
  encodeStatusFromApi,
  encodeStatusFromWebhook,
  fetchBunnyVideo,
  handleBunnyWebhook,
  type BunnyWebhookDeps,
  type EncodeStatus,
} from "../supabase/functions/_shared/bunny.ts";

const MIGRATIONS = [
  "20260816120000_initial_schema.sql",
  "20260816120100_functions_and_triggers.sql",
  "20260816120200_rls_policies.sql",
  "20260817100000_course_format_and_category_order.sql",
  "20260920090000_course_pricing.sql",
  "20260920100000_course_conversion_features.sql",
  "20260921090000_course_manual_enrollment.sql",
  "20260922090000_razorpay_payments.sql",
  "20260923090000_course_module_media.sql",
  "20261103090000_course_lessons_and_access.sql",
  "20261103090200_sw_simulation_seed.sql",
  "20261104090000_recorded_course_player.sql",
];

const U = {
  free: "00000000-0000-0000-0000-0000000000f1",
  paid: "00000000-0000-0000-0000-0000000000e1",
  expired: "00000000-0000-0000-0000-0000000000d1",
  admin: "00000000-0000-0000-0000-0000000000a1",
  combo: "00000000-0000-0000-0000-0000000000c1",
};

let t: TestDb;
const DAY = 24 * 60 * 60 * 1000;

const courseId = (slug: string) => t.one<string>("select id from public.courses where slug = $1", [slug]);
const lessonId = (code: string) => t.one<string>("select id from public.course_lessons where code = $1", [code]);
const lessonAccess = async (user: string | null, code: string) =>
  t.one<boolean>("select public.lesson_access($1, $2::uuid)", [await lessonId(code), user]);

async function enroll(user: string, slug: string) {
  await t.db.query("insert into public.course_registrations (user_id, course_id, status, source) values ($1, $2, 'enrolled', 'admin')", [
    user,
    await courseId(slug),
  ]);
}

async function outline(user: string | null, slug = "solidworks-simulation") {
  let rows: Record<string, unknown>[] = [];
  await t.asUser(user, async () => {
    rows = (await t.db.query<Record<string, unknown>>("select * from public.course_outline($1)", [slug])).rows;
  });
  return rows;
}
const stateOf = (rows: Record<string, unknown>[], code: string) => rows.find((r) => r.lesson_code === code)?.state;

async function saveProgress(user: string | null, code: string, position: number, duration: number | null = null, completed: boolean | null = null) {
  let out: { position_sec: number; completed: boolean } | undefined;
  await t.asUser(user, async () => {
    const { rows } = await t.db.query<{ position_sec: number; completed: boolean }>(
      "select * from public.save_lesson_progress($1, $2, $3, $4)",
      [await lessonId(code), position, duration, completed]
    );
    out = rows[0];
  });
  return out!;
}

async function myLearning(user: string) {
  let rows: Record<string, unknown>[] = [];
  await t.asUser(user, async () => {
    rows = (await t.db.query<Record<string, unknown>>("select * from public.my_learning()")).rows;
  });
  return rows;
}

before(async () => {
  t = await createTestDb(MIGRATIONS);
  await t.addUser(U.free, "free@test.in");
  await t.addUser(U.paid, "paid@test.in");
  await t.addUser(U.expired, "expired@test.in");
  await t.addUser(U.admin, "admin@test.in", "admin");
  await t.addUser(U.combo, "combo@test.in");

  // Module 0 and 1 lessons published; M1.1–M1.3 have encoded videos, M1.4 is still encoding.
  await t.db.exec("update public.course_lessons set is_published = true where code like 'M0%' or code like 'M1%'");
  const videos: [string, EncodeStatus, number | null][] = [
    ["M1.1", "ready", 1000],
    ["M1.2", "ready", 1500],
    ["M1.3", "ready", null],
    ["M1.4", "processing", null],
  ];
  for (const [code, status, dur] of videos) {
    await t.db.query(
      "insert into public.course_lesson_videos (lesson_id, bunny_video_id, encode_status, duration_sec) values ($1, $2, $3, $4)",
      [await lessonId(code), `3f2a9c1e-1111-4222-8333-${code.replace(/\D/g, "").padStart(12, "0")}`, status, dur]
    );
  }
  // Release M3 with one published lesson so there's a paid lesson to test.
  await t.db.exec(`
    update public.course_modules set is_released = true where code = 'L1-M3';
    insert into public.course_lessons (module_id, code, title, order_number, is_published)
    select id, 'M3.1', 'Materials', 1, true from public.course_modules where code = 'L1-M3';
  `);
  await t.db.query("insert into public.course_lesson_videos (lesson_id, bunny_video_id, encode_status) values ($1, $2, 'ready')", [
    await lessonId("M3.1"),
    "3f2a9c1e-1111-4222-8333-000000000031",
  ]);

  await enroll(U.paid, "solidworks-simulation");
  await enroll(U.expired, "solidworks-simulation");
  await t.db.query(
    "update public.course_registrations set expires_at = now() - interval '1 day' where user_id = $1",
    [U.expired]
  );
});

// ---------------------------------------------------------------------------
// Access period

test("SOLIDWORKS Simulation courses last 730 days; enrolling starts the period", async () => {
  const { rows } = await t.db.query<{ slug: string; access_days: number }>(
    "select slug, access_days from public.courses where slug like 'solidworks-simulation%' order by slug"
  );
  assert.deepEqual(rows.map((r) => r.access_days), [730, 730, 730]);

  const exp = await t.one<Date>("select expires_at from public.course_registrations where user_id = $1", [U.paid]);
  const days = (exp.getTime() - Date.now()) / DAY;
  assert.ok(days > 729.9 && days < 730.1, `expires in ${days} days`);
});

test("expired enrollment: paid lessons lock again, free lessons stay open", async () => {
  assert.equal(await lessonAccess(U.paid, "M3.1"), true);
  assert.equal(await lessonAccess(U.expired, "M3.1"), false);
  assert.equal(await lessonAccess(U.expired, "M1.1"), true);
  assert.equal(await lessonAccess(U.free, "M3.1"), false);
  assert.equal(await lessonAccess(null, "M1.1"), false);
});

test("unpublished lessons: closed to learners, open to admins", async () => {
  await t.db.exec("update public.course_lessons set is_published = false where code = 'M3.1'");
  try {
    assert.equal(await lessonAccess(U.paid, "M3.1"), false);
    assert.equal(await lessonAccess(U.admin, "M3.1"), true);
  } finally {
    await t.db.exec("update public.course_lessons set is_published = true where code = 'M3.1'");
  }
});

test("Combo purchase enrolls both levels for 730 days; repeats are no-ops; renewing extends", async () => {
  await t.db.query("insert into public.payments (user_id, course_id, razorpay_order_id, amount) values ($1, $2, 'order_c1', 899900)", [
    U.combo,
    await courseId("solidworks-simulation-combo"),
  ]);
  assert.equal(await t.one("select public.mark_payment_paid('order_c1', 'pay_c1', 899900)"), "paid");
  assert.equal(await t.one("select public.mark_payment_paid('order_c1', 'pay_c1', 899900)"), "already_paid");

  const regs = async () =>
    (
      await t.db.query<{ slug: string; status: string; source: string; expires_at: Date }>(
        `select c.slug, r.status, r.source, r.expires_at from public.course_registrations r
         join public.courses c on c.id = r.course_id where r.user_id = $1 order by c.slug`,
        [U.combo]
      )
    ).rows;
  const first = await regs();
  assert.deepEqual(
    first.map((r) => [r.slug, r.status, r.source]),
    [
      ["solidworks-simulation", "enrolled", "bundle"],
      ["solidworks-simulation-combo", "enrolled", "razorpay"],
      ["solidworks-simulation-level-2", "enrolled", "bundle"],
    ]
  );
  for (const r of first) assert.ok(Math.abs((r.expires_at.getTime() - Date.now()) / DAY - 730) < 0.1);

  // Level 2 lessons need the course published; Level 1 is open now.
  assert.equal(await lessonAccess(U.combo, "M3.1"), true);

  // Shorten Level 1, then buy Level 1 again: access runs to the later date (now + 730), not shorter.
  await t.db.query(
    `update public.course_registrations set expires_at = now() + interval '10 days'
     where user_id = $1 and course_id = $2`,
    [U.combo, await courseId("solidworks-simulation")]
  );
  await t.db.query("insert into public.payments (user_id, course_id, razorpay_order_id, amount) values ($1, $2, 'order_c2', 399900)", [
    U.combo,
    await courseId("solidworks-simulation"),
  ]);
  assert.equal(await t.one("select public.mark_payment_paid('order_c2', 'pay_c2', 399900)"), "paid");
  const l1 = (await regs()).find((r) => r.slug === "solidworks-simulation")!;
  assert.equal(l1.source, "razorpay");
  assert.ok(Math.abs((l1.expires_at.getTime() - Date.now()) / DAY - 730) < 0.1);

  // Expired, then renewed: a fresh 730 days.
  await t.db.query("update public.course_registrations set expires_at = now() - interval '5 days' where user_id = $1", [U.combo]);
  await t.db.query("insert into public.payments (user_id, course_id, razorpay_order_id, amount) values ($1, $2, 'order_c3', 399900)", [
    U.combo,
    await courseId("solidworks-simulation"),
  ]);
  await t.one("select public.mark_payment_paid('order_c3', 'pay_c3', 399900)");
  const renewed = (await regs()).find((r) => r.slug === "solidworks-simulation")!;
  assert.ok(Math.abs((renewed.expires_at.getTime() - Date.now()) / DAY - 730) < 0.1);
});

test("my_purchases lists paid orders with course titles, including the unlisted Combo", async () => {
  let rows: { razorpay_order_id: string; course_title: string; amount: number }[] = [];
  await t.asUser(U.combo, async () => {
    rows = (await t.db.query<(typeof rows)[number]>("select razorpay_order_id, course_title, amount from public.my_purchases()")).rows;
  });
  assert.deepEqual(rows.map((r) => r.razorpay_order_id).sort(), ["order_c1", "order_c2", "order_c3"]);
  assert.ok(rows.find((r) => r.razorpay_order_id === "order_c1")!.course_title.includes("Combo"));
  await t.asUser(U.free, async () => assert.equal(await t.one("select count(*)::int from public.my_purchases()"), 0));
});

// ---------------------------------------------------------------------------
// course_outline — the lock icons come from here

test("outline: signed out sees 'signin' on free lessons and 'locked' on paid ones", async () => {
  const rows = await outline(null);
  assert.equal(stateOf(rows, "M1.1"), "signin");
  assert.equal(stateOf(rows, "M3.1"), "locked");
  // Unreleased modules come back once, as coming soon, with no lesson.
  const m5 = rows.filter((r) => r.module_code === "L1-M5");
  assert.equal(m5.length, 1);
  assert.equal(m5[0].lesson_id, null);
});

test("outline: free user — open / processing / locked / coming soon", async () => {
  const rows = await outline(U.free);
  assert.equal(stateOf(rows, "M1.1"), "open");
  assert.equal(stateOf(rows, "M1.4"), "processing");
  assert.equal(stateOf(rows, "M1.5"), "processing", "no video yet");
  assert.equal(stateOf(rows, "M0-QUIZ"), "open", "non-video lessons don't need a video");
  assert.equal(stateOf(rows, "M3.1"), "locked");
});

test("outline: enrolled user opens paid lessons; expired user is locked out again", async () => {
  assert.equal(stateOf(await outline(U.paid), "M3.1"), "open");
  assert.equal(stateOf(await outline(U.expired), "M3.1"), "locked");
});

test("outline: publishing a lesson shows it at once — no re-enrollment", async () => {
  await t.db.exec("update public.course_lessons set is_published = false where code = 'M3.1'");
  assert.equal(stateOf(await outline(U.paid), "M3.1"), "coming_soon");
  await t.db.exec("update public.course_lessons set is_published = true where code = 'M3.1'");
  assert.equal(stateOf(await outline(U.paid), "M3.1"), "open");
});

test("outline: unpublished courses are hidden except from admins", async () => {
  assert.equal((await outline(U.free, "solidworks-simulation-level-2")).length, 0);
  assert.ok((await outline(U.admin, "solidworks-simulation-level-2")).length > 0);
});

// ---------------------------------------------------------------------------
// Progress

test("progress: signed out or locked → refused", async () => {
  await assert.rejects(saveProgress(null, "M1.1", 10), /permission denied|not signed in/);
  await assert.rejects(saveProgress(U.free, "M3.1", 10), /no access/);
});

test("progress: position saved, complete at 90%, never un-completes on its own; manual toggle works", async () => {
  assert.deepEqual(await saveProgress(U.free, "M1.1", 120), { position_sec: 120, completed: false });
  assert.deepEqual(await saveProgress(U.free, "M1.1", 905), { position_sec: 905, completed: true });
  // Re-watching from the start keeps it complete.
  assert.deepEqual(await saveProgress(U.free, "M1.1", 30), { position_sec: 30, completed: true });
  // Positions past the end are clamped.
  assert.equal((await saveProgress(U.free, "M1.2", 99999)).position_sec, 1500);
  // Manual un-mark / mark.
  assert.equal((await saveProgress(U.free, "M1.2", 0, null, false)).completed, false);
  assert.equal((await saveProgress(U.free, "M0-QUIZ", 0, null, true)).completed, true);
  // Unknown stored duration: the player's duration is used.
  assert.equal((await saveProgress(U.free, "M1.3", 95, 100)).completed, true);
  await t.db.query("delete from public.lesson_progress where lesson_id = $1", [await lessonId("M1.3")]);
});

test("progress rows: own rows only, and no direct writes", async () => {
  await t.asUser(U.paid, async () => assert.equal(await t.one("select count(*)::int from public.lesson_progress"), 0));
  await t.asUser(U.free, async () => {
    assert.ok((await t.one<number>("select count(*)::int from public.lesson_progress")) > 0);
    await assert.rejects(
      t.db.query("insert into public.lesson_progress (user_id, lesson_id, course_id) values ($1, $2, $3)", [
        U.free,
        await lessonId("M1.5"),
        await courseId("solidworks-simulation"),
      ]),
      /row-level security/
    );
  });
});

// ---------------------------------------------------------------------------
// My Learning

test("My Learning: free user gets a preview card with progress and a Continue lesson", async () => {
  const [card, ...rest] = await myLearning(U.free);
  assert.equal(rest.length, 0, "Level 2 and the Combo aren't shown");
  assert.equal(card.slug, "solidworks-simulation");
  assert.equal(card.access, "preview");
  // M0 (5) + M1 (7) + M3.1 published in released modules.
  assert.equal(card.total_lessons, 13);
  assert.equal(card.completed_lessons, 2); // M1.1 and M0-QUIZ
  // Last touched was M0-QUIZ (completed) → next open unfinished lesson after it.
  assert.equal(card.next_lesson_code, "M1.2");
});

test("My Learning: Continue resumes an unfinished lesson at its position", async () => {
  await saveProgress(U.free, "M1.2", 300);
  const [card] = await myLearning(U.free);
  assert.equal(card.next_lesson_code, "M1.2");
  assert.equal(card.next_position_sec, 300);
});

test("My Learning: enrolled, expired and admin cards", async () => {
  const [paid] = await myLearning(U.paid);
  assert.equal(paid.access, "enrolled");
  assert.ok(paid.expires_at instanceof Date);
  assert.equal(paid.next_lesson_code, "M0.1", "nothing watched yet → first lesson");

  assert.equal((await myLearning(U.expired))[0].access, "expired");
  const admin = await myLearning(U.admin);
  assert.ok(admin.every((r) => r.access === "admin"));
});

// ---------------------------------------------------------------------------
// lesson-play-url

const LESSON = { id: "11111111-2222-4333-8444-555566667777", code: "M1.1", title: "Why", kind: "video", is_published: true, module_id: "m1" };
const VIDEO = "3f2a9c1e-1111-4222-8333-444455556666";

function playDeps(over: Partial<PlayDeps> = {}): PlayDeps {
  return {
    getLesson: async (id) => (id === LESSON.id ? LESSON : null),
    hasAccess: async (_l, uid) => uid === "free-user",
    isAdmin: async () => false,
    getVideo: async () => ({ bunny_video_id: VIDEO, encode_status: "ready", library_id: null }),
    getResumeAt: async () => 42,
    env: { libraryId: "12345", tokenKey: "tok-secret" },
    now: () => 1_800_000_000_000,
    ...over,
  };
}

test("signed Bunny embed URL uses SHA256(key + video id + expires)", async () => {
  const url = new URL(await signBunnyEmbedUrl("12345", "tok-secret", VIDEO, 1_800_010_800));
  assert.equal(url.origin + url.pathname, `https://player.mediadelivery.net/embed/12345/${VIDEO}`);
  assert.equal(url.searchParams.get("expires"), "1800010800");
  assert.equal(url.searchParams.get("token"), createHash("sha256").update(`tok-secret${VIDEO}1800010800`).digest("hex"));
});

test("play: 401 signed out, 403 locked, 200 with a signed URL and the resume position", async () => {
  const body = { lessonId: LESSON.id };
  const out = await handlePlay(body, null, playDeps());
  assert.equal(out.status, 401);
  const locked = await handlePlay(body, "someone", playDeps());
  assert.equal(locked.status, 403);
  assert.ok(!JSON.stringify(locked.body).includes(VIDEO), "a refusal never contains the video id");

  const ok = await handlePlay(body, "free-user", playDeps());
  assert.equal(ok.status, 200);
  assert.ok("url" in ok.body);
  const url = new URL(ok.body.url);
  assert.ok(url.searchParams.get("token")?.match(/^[0-9a-f]{64}$/), "never an unsigned URL");
  assert.equal(ok.body.expires, 1_800_000_000 + DEFAULT_TTL_SECONDS);
  assert.ok(DEFAULT_TTL_SECONDS >= 2 * 3600 && DEFAULT_TTL_SECONDS <= 4 * 3600);
  assert.equal(ok.body.resumeAt, 42);
});

test("play: coming soon, admin preview, no video, still encoding, library override, bad input, missing secrets", async () => {
  const body = { lessonId: LESSON.id };
  const unpublished = playDeps({ getLesson: async () => ({ ...LESSON, is_published: false }) });
  assert.equal((await handlePlay(body, "free-user", unpublished)).status, 404);
  assert.equal((await handlePlay(body, "free-user", { ...unpublished, isAdmin: async () => true })).status, 200);
  assert.equal((await handlePlay(body, "free-user", playDeps({ getVideo: async () => null }))).status, 404);

  const encoding = await handlePlay(body, "free-user", playDeps({ getVideo: async () => ({ bunny_video_id: VIDEO, encode_status: "processing", library_id: null }) }));
  assert.equal(encoding.status, 409);
  assert.ok(!JSON.stringify(encoding.body).includes(VIDEO));

  const other = await handlePlay(body, "free-user", playDeps({ getVideo: async () => ({ bunny_video_id: VIDEO, encode_status: "ready", library_id: "777" }) }));
  assert.ok("url" in other.body && other.body.url.includes("/embed/777/"));

  assert.equal((await handlePlay({ lessonId: "x" }, "free-user", playDeps())).status, 400);
  assert.equal((await handlePlay(body, "free-user", playDeps({ env: {} }))).status, 500);
});

// ---------------------------------------------------------------------------
// Bunny status + webhook

test("Bunny status codes: API and webhook enums map separately", () => {
  assert.equal(encodeStatusFromApi(4), "ready");
  assert.equal(encodeStatusFromApi(3), "processing", "API 3 = Transcoding");
  assert.equal(encodeStatusFromApi(5), "failed");
  assert.equal(encodeStatusFromWebhook(3), "ready", "webhook 3 = Finished");
  assert.equal(encodeStatusFromWebhook(5), "failed");
  assert.equal(encodeStatusFromWebhook(9), null, "captions don't change playability");
  assert.equal(encodeStatusFromWebhook(32), "none");
});

const SECRET = "read-only-key";
const sign = (raw: string) => createHmac("sha256", SECRET).update(raw).digest("hex");
const hookHeaders = (raw: string, sig = sign(raw)) =>
  new Headers({ "X-BunnyStream-Signature": sig, "X-BunnyStream-Signature-Version": "v1", "X-BunnyStream-Signature-Algorithm": "hmac-sha256" });

/** The webhook's updateStatus against the real table, as the Edge Function's PATCH does it. */
function webhookDeps(): BunnyWebhookDeps & { durations: string[] } {
  const durations: string[] = [];
  return {
    secret: SECRET,
    durations,
    updateStatus: async (guid, status, at) => {
      const { rows } = await t.db.query(
        `update public.course_lesson_videos set encode_status = $2, encode_updated_at = $3
         where bunny_video_id = $1 and (encode_updated_at is null or encode_updated_at < $3) returning lesson_id`,
        [guid, status, at]
      );
      return rows.length;
    },
    refreshDuration: async (guid) => {
      durations.push(guid);
    },
  };
}

test("webhook: rejects bad signatures; sets status; idempotent; ignores late deliveries", async () => {
  const guid = "3f2a9c1e-1111-4222-8333-000000000014"; // M1.4, processing
  const statusOf = () => t.one<string>("select encode_status from public.course_lesson_videos where bunny_video_id = $1", [guid]);
  const deps = webhookDeps();
  const event = (Status: number, Timestamp: string) =>
    JSON.stringify({ IsLiveStreamWebhook: false, VideoLibraryId: 12345, VideoGuid: guid, Status, EventId: crypto.randomUUID(), Timestamp });

  const finished = event(3, new Date(Date.now() + 60_000).toISOString());
  assert.equal((await handleBunnyWebhook(finished, hookHeaders(finished, "0".repeat(64)), deps)).status, 401);
  assert.equal((await handleBunnyWebhook(finished, new Headers(), deps)).status, 401);
  assert.equal((await handleBunnyWebhook(finished, hookHeaders(finished), { ...deps, secret: undefined })).status, 500);
  assert.equal(await statusOf(), "processing");

  const ok = await handleBunnyWebhook(finished, hookHeaders(finished), deps);
  assert.deepEqual(ok, { status: 200, body: { ok: true, updated: 1 } });
  assert.equal(await statusOf(), "ready");
  assert.deepEqual(deps.durations, [guid], "duration refreshed once encoded");
  // M1.4 now plays for the free user.
  assert.equal(stateOf(await outline(U.free), "M1.4"), "open");

  // Same delivery again: nothing changes, still 200.
  assert.equal((await handleBunnyWebhook(finished, hookHeaders(finished), deps)).status, 200);
  assert.equal(await statusOf(), "ready");

  // An older "encoding" event arriving late is ignored.
  const late = event(2, new Date(Date.now() - 60_000).toISOString());
  assert.deepEqual((await handleBunnyWebhook(late, hookHeaders(late), deps)).body, { ok: true, updated: 0 });
  assert.equal(await statusOf(), "ready");

  // Captions event: acknowledged, ignored.
  const captions = event(9, new Date(Date.now() + 120_000).toISOString());
  assert.equal((await handleBunnyWebhook(captions, hookHeaders(captions), deps)).body.ignored, "status 9");

  // Malformed but signed: 400 (Bunny doesn't retry 4xx).
  const bad = JSON.stringify({ VideoGuid: "nope", Status: 3 });
  assert.equal((await handleBunnyWebhook(bad, hookHeaders(bad), deps)).status, 400);
});

test("Fetch from Bunny: reads status and length with the AccessKey header", async () => {
  let seen: { url: string; key: string | null } | null = null;
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    seen = { url, key: new Headers(init?.headers).get("AccessKey") };
    return new Response(JSON.stringify({ status: 4, length: 1234, title: "M1.1" }), { status: 200 });
  }) as typeof fetch;
  const info = await fetchBunnyVideo("12345", VIDEO, "api-key", fakeFetch);
  assert.deepEqual(info, { encode_status: "ready", duration_sec: 1234, bunny_status: 4, title: "M1.1" });
  assert.deepEqual(seen, { url: `https://video.bunnycdn.com/library/12345/videos/${VIDEO}`, key: "api-key" });

  const missing = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
  assert.equal(await fetchBunnyVideo("12345", VIDEO, "api-key", missing), null);
});

test("seed and migrations re-run cleanly", async () => {
  await t.db.exec(read("20261103090200_sw_simulation_seed.sql"));
});
