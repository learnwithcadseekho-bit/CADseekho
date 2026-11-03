// SOLIDWORKS Simulation launch: seed idempotency, the free/paid lesson access
// rule, the registration-insert fix, bundle enrollment, signed Bunny URLs and
// config-driven checkout. Runs the real migrations in an in-process Postgres
// (PGlite) with just enough Supabase stubbed in. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { handlePlay, signBunnyEmbedUrl, type PlayDeps } from "../supabase/functions/lesson-play-url/play.ts";
import { swSimCheckout, swSimPrice, type SwSimConfig } from "../supabase/functions/_shared/swSimulationPricing.ts";
import { LEVEL1_MODULES, LEVEL2_MODULES, SW_SIM_CONFIG, priceLine } from "../src/content/swSimulation.ts";

// auth / storage / pg_net as Supabase provides them, minimally.
const STUBS = `
  create role anon; create role authenticated;
  create schema auth; create schema storage; create schema net;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as
    $$ select case when auth.uid() is null then 'anon' else 'authenticated' end $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function net.http_post(url text, headers jsonb, body jsonb) returns bigint language sql as 'select 1::bigint';
`;

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
];
const SEED = "20261103090200_sw_simulation_seed.sql";
const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf-8");

const USERS = {
  free: "00000000-0000-0000-0000-00000000000f",
  paid: "00000000-0000-0000-0000-00000000000e",
  admin: "00000000-0000-0000-0000-00000000000a",
};

let db: PGlite;

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.query<Record<string, T>>(sql, params);
  return Object.values(rows[0])[0];
}

async function asUser(userId: string | null, fn: () => Promise<void>) {
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  try {
    await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

const moduleId = (code: string) => one<string>("select id from public.course_modules where code = $1", [code]);
const courseId = (slug: string) => one<string>("select id from public.courses where slug = $1", [slug]);
const canAccess = async (userId: string | null, code: string) =>
  one<boolean>("select public.module_access($1, $2::uuid)", [await moduleId(code), userId]);

before(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  for (const f of MIGRATIONS) {
    try {
      await db.exec(read(f));
    } catch (err) {
      throw new Error(`${f}: ${(err as Error).message}`);
    }
  }
  // Supabase grants these to the API roles; RLS does the real filtering.
  await db.exec(`
    grant usage on schema public, storage to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
    grant all on all tables in schema storage to anon, authenticated;
  `);
  await db.exec(read(SEED));
  for (const [name, id] of Object.entries(USERS)) {
    // The signup trigger creates the profile.
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${name}@test.in`]);
  }
  // Fixture only: skip the "only admins can change role" guard trigger to make the admin.
  await db.exec("set session_replication_role = replica");
  await db.query("update public.profiles set role = 'admin' where id = $1", [USERS.admin]);
  await db.exec("set session_replication_role = origin");
  await db.query("insert into public.course_registrations (user_id, course_id, status) values ($1, $2, 'enrolled')", [
    USERS.paid,
    await courseId("solidworks-simulation"),
  ]);
});

// ---------------------------------------------------------------------------
// Seed

test("seed creates Level 1, Level 2 and the Combo, and running it again duplicates nothing", async () => {
  const counts = async () =>
    db.query(`select
      (select count(*) from public.courses where slug like 'solidworks-simulation%')::int as courses,
      (select count(*) from public.course_modules)::int as modules,
      (select count(*) from public.course_lessons)::int as lessons,
      (select count(*) from public.course_files)::int as files`);
  const first = (await counts()).rows[0];
  assert.deepEqual(first, { courses: 3, modules: 19, lessons: 12, files: 3 });
  await db.exec(read(SEED));
  await db.exec(read(SEED));
  assert.deepEqual((await counts()).rows[0], first);

  const courses = await db.query<{ slug: string; is_published: boolean; bundle: number | null }>(
    "select slug, is_published, cardinality(bundle_course_ids) as bundle from public.courses order by slug"
  );
  assert.deepEqual(courses.rows, [
    { slug: "solidworks-simulation", is_published: true, bundle: null },
    { slug: "solidworks-simulation-combo", is_published: false, bundle: 2 },
    { slug: "solidworks-simulation-level-2", is_published: false, bundle: null },
  ]);
});

test("seed syllabus matches src/content/swSimulation.ts", async () => {
  const { rows } = await db.query<{ code: string; title: string; hours: string | null; is_free: boolean; is_released: boolean }>(
    "select code, title, hours::text, is_free, is_released from public.course_modules order by code"
  );
  const expected = [...LEVEL1_MODULES, ...LEVEL2_MODULES]
    .map((m) => ({ code: m.code, title: m.title, hours: m.hours === null ? null : m.hours.toFixed(1), is_free: m.free, is_released: m.released }))
    .sort((a, b) => a.code.localeCompare(b.code));
  assert.deepEqual(rows, expected);

  const lessons = await db.query<{ module: string; code: string; title: string; kind: string; minutes: number | null }>(
    `select m.code as module, l.code, l.title, l.kind, l.duration_minutes as minutes
     from public.course_lessons l join public.course_modules m on m.id = l.module_id order by m.code, l.order_number`
  );
  const expectedLessons = LEVEL1_MODULES.flatMap((m) =>
    m.lessons.map((l) => ({ module: m.code, code: l.code, title: l.title, kind: l.kind, minutes: l.minutes }))
  );
  assert.deepEqual(lessons.rows, expectedLessons);

  // Free modules in the config are the ones flagged free.
  assert.deepEqual(
    rows.filter((r) => r.is_free).map((r) => r.code),
    SW_SIM_CONFIG.freeModules
  );
});

// ---------------------------------------------------------------------------
// Access rule

test("free modules: any signed-in user; signed-out users: nothing", async () => {
  assert.equal(await canAccess(null, "L1-M0"), false);
  assert.equal(await canAccess(null, "L1-M1"), false);
  assert.equal(await canAccess(USERS.free, "L1-M0"), true);
  assert.equal(await canAccess(USERS.free, "L1-M1"), true);
});

test("paid modules: locked for free users, open to enrolled users once released", async () => {
  // M3 isn't released yet: locked even for the enrolled user.
  assert.equal(await canAccess(USERS.paid, "L1-M3"), false);
  await db.query("update public.course_modules set is_released = true where code in ('L1-M2', 'L1-M3')");
  try {
    assert.equal(await canAccess(USERS.free, "L1-M3"), false);
    assert.equal(await canAccess(USERS.paid, "L1-M3"), true);
    // M2 is free: once released, any signed-in user may watch it.
    assert.equal(await canAccess(USERS.free, "L1-M2"), true);
    assert.equal(await canAccess(null, "L1-M2"), false);
  } finally {
    await db.query("update public.course_modules set is_released = false where code in ('L1-M2', 'L1-M3')");
  }
});

test("admins can open everything, including unreleased and unpublished-course modules", async () => {
  assert.equal(await canAccess(USERS.admin, "L1-M5"), true);
  assert.equal(await canAccess(USERS.admin, "L2-M1"), true);
  assert.equal(await canAccess(USERS.paid, "L2-M1"), false);
});

test("can_access_module uses the caller's session (RLS-style)", async () => {
  const m1 = await moduleId("L1-M1");
  await asUser(null, async () => assert.equal(await one("select public.can_access_module($1)", [m1]), false));
  await asUser(USERS.free, async () => assert.equal(await one("select public.can_access_module($1)", [m1]), true));
});

test("Bunny video ids are hidden from everyone but admins", async () => {
  const lesson = await one<string>("select id from public.course_lessons where code = 'M1.1'");
  await db.query("insert into public.course_lesson_videos (lesson_id, bunny_video_id) values ($1, $2)", [
    lesson,
    "3f2a9c1e-1111-4222-8333-444455556666",
  ]);
  for (const user of [null, USERS.free, USERS.paid]) {
    await asUser(user, async () => {
      assert.equal(await one("select count(*)::int from public.course_lesson_videos"), 0);
      // …while the lesson list itself is public.
      assert.equal(await one("select count(*)::int from public.course_lessons"), 12);
    });
  }
  await asUser(USERS.admin, async () => assert.equal(await one("select count(*)::int from public.course_lesson_videos"), 1));
});

test("downloads follow the same rule in storage, and test/answer files are refused", async () => {
  const path = "L1-M1/L1M1_Start_Files.zip";
  await db.query("insert into storage.objects (bucket_id, name) values ('course-files', $1)", [path]);
  const visible = async (user: string | null) => {
    let n = 0;
    await asUser(user, async () => {
      n = await one<number>("select count(*)::int from storage.objects where bucket_id = 'course-files' and name = $1", [path]);
    });
    return n;
  };
  assert.equal(await visible(null), 0);
  assert.equal(await visible(USERS.free), 1);

  await assert.rejects(
    db.query("insert into public.course_files (module_id, title, storage_path) values ($1, 'x', 'L1-M1/L1_M1_Test.pdf')", [
      await moduleId("L1-M1"),
    ]),
    /course_files_no_answer_files/
  );
  await asUser(USERS.admin, async () => {
    await assert.rejects(
      db.query("insert into storage.objects (bucket_id, name) values ('course-files', 'L1-M1/Bracket_Solved.SLDPRT')"),
      /row-level security/
    );
  });
});

test("users can no longer self-enroll by inserting status 'enrolled'", async () => {
  const combo = await courseId("solidworks-simulation-level-2");
  await asUser(USERS.free, async () => {
    await assert.rejects(
      db.query("insert into public.course_registrations (user_id, course_id, status) values ($1, $2, 'enrolled')", [USERS.free, combo]),
      /row-level security/
    );
  });
  // A plain registration (what the site sends) still works — on a published course.
  await asUser(USERS.free, async () => {
    await db.query("insert into public.course_registrations (user_id, course_id) values ($1, $2)", [
      USERS.free,
      await courseId("solidworks-simulation"),
    ]);
  });
  assert.equal(await canAccess(USERS.free, "L1-M3"), false); // 'registered' isn't 'enrolled'
});

test("paying for the Combo enrolls into Level 1 and Level 2", async () => {
  const buyer = "00000000-0000-0000-0000-0000000000bb";
  await db.query("insert into auth.users (id, email) values ($1, 'buyer@test.in')", [buyer]);
  await db.query("insert into public.profiles (id, email) values ($1, 'buyer@test.in') on conflict do nothing", [buyer]);
  await db.query("insert into public.payments (user_id, course_id, razorpay_order_id, amount) values ($1, $2, 'order_combo', 899900)", [
    buyer,
    await courseId("solidworks-simulation-combo"),
  ]);
  assert.equal(await one("select public.mark_payment_paid('order_combo', 'pay_1', 899900)"), "paid");
  assert.equal(await one("select public.mark_payment_paid('order_combo', 'pay_1', 899900)"), "already_paid");
  const { rows } = await db.query<{ slug: string; status: string }>(
    `select c.slug, r.status from public.course_registrations r join public.courses c on c.id = r.course_id
     where r.user_id = $1 order by c.slug`,
    [buyer]
  );
  assert.deepEqual(rows, [
    { slug: "solidworks-simulation", status: "enrolled" },
    { slug: "solidworks-simulation-combo", status: "enrolled" },
    { slug: "solidworks-simulation-level-2", status: "enrolled" },
  ]);
});

// ---------------------------------------------------------------------------
// lesson-play-url

const LESSON = { id: "11111111-2222-4333-8444-555566667777", code: "M1.1", title: "Why", is_published: true, module_id: "m1" };
const VIDEO = "3f2a9c1e-1111-4222-8333-444455556666";

function playDeps(over: Partial<PlayDeps> = {}): PlayDeps {
  return {
    getLesson: async (id) => (id === LESSON.id ? LESSON : null),
    hasAccess: async (_m, uid) => uid === "free-user",
    isAdmin: async () => false,
    getVideoId: async () => VIDEO,
    env: { libraryId: "12345", tokenKey: "tok-secret" },
    now: () => 1_800_000_000_000,
    ...over,
  };
}

test("signed Bunny embed URL uses SHA256(key + video id + expires)", async () => {
  const url = new URL(await signBunnyEmbedUrl("12345", "tok-secret", VIDEO, 1_800_010_800));
  assert.equal(url.origin + url.pathname, `https://iframe.mediadelivery.net/embed/12345/${VIDEO}`);
  assert.equal(url.searchParams.get("expires"), "1800010800");
  assert.equal(url.searchParams.get("token"), createHash("sha256").update(`tok-secret${VIDEO}1800010800`).digest("hex"));
});

test("play: signed out → sign up prompt; locked → 403; allowed → signed URL", async () => {
  const body = { lessonId: LESSON.id };
  assert.equal((await handlePlay(body, null, playDeps())).body.code === "signed_out", true);
  const locked = await handlePlay(body, "someone", playDeps());
  assert.equal(locked.status, 403);
  assert.ok(!JSON.stringify(locked.body).includes(VIDEO), "a locked response never contains the video id");

  const ok = await handlePlay(body, "free-user", playDeps());
  assert.equal(ok.status, 200);
  assert.ok("url" in ok.body && ok.body.url.includes("token=") && ok.body.url.includes("expires="));
  assert.equal("url" in ok.body && ok.body.expires, 1_800_000_000 + 3 * 60 * 60);
});

test("play: unpublished lesson, missing video, bad input, missing secrets", async () => {
  const body = { lessonId: LESSON.id };
  const unpublished = playDeps({ getLesson: async () => ({ ...LESSON, is_published: false }) });
  assert.equal((await handlePlay(body, "free-user", unpublished)).body.code === "coming_soon", true);
  // Admins can preview an unpublished lesson.
  assert.equal((await handlePlay(body, "free-user", { ...unpublished, isAdmin: async () => true })).status, 200);
  assert.equal((await handlePlay(body, "free-user", playDeps({ getVideoId: async () => null }))).body.code === "no_video", true);
  assert.equal((await handlePlay({ lessonId: "x" }, "free-user", playDeps())).status, 400);
  assert.equal((await handlePlay(body, "free-user", playDeps({ env: {} }))).status, 500);
});

// ---------------------------------------------------------------------------
// Prices from the config

test("checkout: closed while salesOpen is false, config prices once open", () => {
  const closed = SW_SIM_CONFIG;
  assert.equal(closed.salesOpen, false, "ship with sales closed until confirmed");
  const r = swSimCheckout(closed, "solidworks-simulation");
  assert.ok(r && !r.ok);
  assert.equal(swSimCheckout(closed, "ansys-workbench-foundation"), null, "other courses keep courses.price");

  const open: SwSimConfig = { ...closed, salesOpen: true };
  assert.deepEqual(swSimCheckout(open, "solidworks-simulation"), { ok: true, product: "level1", amountPaise: 399900 });
  assert.deepEqual(swSimCheckout(open, "solidworks-simulation-combo"), { ok: true, product: "combo", amountPaise: 899900 });
  // Level 2 alone: no founding-batch price and coming soon.
  assert.ok(!swSimCheckout(open, "solidworks-simulation-level-2")!.ok);

  const launch: SwSimConfig = { ...open, activePriceTier: "launch", level2Status: "available" };
  assert.equal(swSimPrice(launch, "level2"), 7999);
  assert.deepEqual(swSimCheckout(launch, "solidworks-simulation-level-2"), { ok: true, product: "level2", amountPaise: 799900 });
});

test("price lines: founding batch, Level 2 at its launch price, regular price alongside", () => {
  assert.equal(priceLine("level1"), "₹3,999 founding batch (regular ₹7,999) + GST");
  assert.equal(priceLine("level2"), "₹7,999 launch price (regular ₹11,999) + GST");
  assert.equal(priceLine("combo"), "₹8,999 founding batch (regular ₹16,999) + GST");
  // Level 2 has a price now but is still coming soon, so it can't be bought.
  assert.equal(swSimPrice(SW_SIM_CONFIG, "level2"), 7999);
  assert.ok(!swSimCheckout({ ...SW_SIM_CONFIG, salesOpen: true }, "solidworks-simulation-level-2")!.ok);
});

test("syllabus totals match the course pages: 28 h + 35 h, 17 modules", () => {
  const hours = (ms: typeof LEVEL1_MODULES) => ms.reduce((a, m) => a + (m.hours ?? 0), 0);
  assert.equal(hours(LEVEL1_MODULES), 28);
  assert.equal(hours(LEVEL2_MODULES), 35);
  assert.equal([...LEVEL1_MODULES, ...LEVEL2_MODULES].filter((m) => !m.code.endsWith("-CP")).length, 17);
});
