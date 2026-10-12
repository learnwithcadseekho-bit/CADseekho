// Tests for the demo-booking endpoint (supabase/functions/submit-lead) against
// the real leads migration, run in an in-process Postgres (PGlite) — no
// Supabase or network needed. Run: npm test
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  CONSENT_TEXT,
  handleLead,
  normaliseIndianMobile,
  type LeadDeps,
  type LeadInput,
  type SaveResult,
} from "../supabase/functions/submit-lead/lead.ts";

// Just enough of the Supabase schema for the migration to apply.
const STUBS = `
  create role anon; create role authenticated;
  create table public.profiles (id uuid primary key, email text not null, phone text, role text default 'user');
  create table public.payments (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text not null default 'created');
  create function public.is_admin() returns boolean language sql as 'select true';
  create function public.set_updated_at() returns trigger language plpgsql as 'begin new.updated_at = now(); return new; end';
`;
const MIGRATION = readFileSync(new URL("../supabase/migrations/20261012090000_leads.sql", import.meta.url), "utf-8");

let db: PGlite;
let sheetCalls: { url: string; init: RequestInit }[];
let sheetResponses: (() => Response)[];
let background: Promise<unknown>[];

async function freshDb() {
  db = new PGlite();
  await db.exec(STUBS);
  await db.exec(MIGRATION);
}

function deps(over: Partial<LeadDeps> = {}): LeadDeps {
  return {
    verifyTurnstile: async (token) => token === "ok-token",
    hashIp: async (ip) => `hash:${ip}`,
    saveLead: async (lead: LeadInput, ipHash: string) => {
      const { rows } = await db.query<{ r: SaveResult }>("select public.submit_lead($1::jsonb, $2) as r", [
        JSON.stringify(lead),
        ipHash,
      ]);
      return rows[0].r;
    },
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      sheetCalls.push({ url: String(url), init: init ?? {} });
      const next = sheetResponses.shift();
      return next ? next() : new Response('{"ok":true}', { status: 200 });
    }) as typeof fetch,
    env: { sheetWebhookUrl: "https://sheet.test/exec", sheetSecret: "s3cret", adminEmail: "info@cadseekho.com" },
    background: (task) => background.push(task),
    log: () => {},
    retryDelayMs: 0,
    ...over,
  };
}

const valid = (over: Record<string, unknown> = {}) => ({
  name: "Asha Verma",
  phone: "98765 43210",
  email: "Asha@Example.com",
  role: "student",
  org: "DTU",
  city: "Delhi",
  cad: ["SolidWorks", "Creo"],
  consent: true,
  website: "",
  turnstileToken: "ok-token",
  page: "/ansys-foundation",
  utm: { utm_source: "facebook", utm_campaign: "ansys_launch", utm_content: "ad_9x16", fbclid: "fb.1" },
  ...over,
});

const meta = { ip: "203.0.113.7", userAgent: "test-agent" };
const leadCount = async () => (await db.query<{ n: number }>("select count(*)::int as n from public.leads")).rows[0].n;

beforeEach(async () => {
  await freshDb();
  sheetCalls = [];
  sheetResponses = [];
  background = [];
});

test("phone normalisation accepts 10 digits and +91 / 91 / 0 prefixes", () => {
  for (const raw of ["9876543210", "+91 98765 43210", "+919876543210", "919876543210", "09876543210", "98765-43210"])
    assert.equal(normaliseIndianMobile(raw), "+919876543210", raw);
  for (const raw of ["12345", "5876543210", "+1 9876543210", "98765432101", "", null])
    assert.equal(normaliseIndianMobile(raw), null, String(raw));
});

test("valid lead is saved with normalised fields", async () => {
  const res = await handleLead(valid(), meta, deps());
  assert.equal(res.status, 200);
  assert.ok("ok" in res.body && res.body.ok && !res.body.duplicate);
  const { rows } = await db.query<Record<string, unknown>>("select * from public.leads");
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.phone, "+919876543210");
  assert.equal(row.email, "asha@example.com");
  assert.equal(row.role, "student");
  assert.deepEqual(row.cad, ["SolidWorks", "Creo"]);
  assert.equal(row.consent, true);
  assert.equal(row.consent_text, CONSENT_TEXT);
  assert.equal(row.source, "website");
  assert.deepEqual(row.utm, { utm_source: "facebook", utm_campaign: "ansys_launch", utm_content: "ad_9x16" });
  assert.equal(row.fbclid, "fb.1");
  assert.equal(row.status, "new");
  assert.equal(row.demo_booked, true);
  assert.equal(row.attended, false);
  assert.equal(row.paid, false);
  assert.equal(row.user_agent, "test-agent");
});

test("invalid phone is rejected and nothing is saved", async () => {
  const res = await handleLead(valid({ phone: "12345 67890" }), meta, deps());
  assert.equal(res.status, 400);
  assert.equal("field" in res.body && res.body.field, "phone");
  assert.equal(await leadCount(), 0);
});

test("missing consent is rejected", async () => {
  for (const consent of [false, undefined, "true"]) {
    const res = await handleLead(valid({ consent }), meta, deps());
    assert.equal(res.status, 400);
    assert.equal("field" in res.body && res.body.field, "consent");
  }
  assert.equal(await leadCount(), 0);
});

test("other field rules: name length, email, role, CAD list", async () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ name: "A" }, "name"],
    [{ name: "x".repeat(61) }, "name"],
    [{ email: "not-an-email" }, "email"],
    [{ role: "teacher" }, "role"],
    [{ role: "toString" }, "role"],
    [{ cad: ["Fusion 360"] }, "cad"],
  ];
  for (const [over, field] of cases) {
    const res = await handleLead(valid(over), meta, deps());
    assert.equal(res.status, 400, JSON.stringify(over));
    assert.equal("field" in res.body && res.body.field, field);
  }
  // Optional email may be blank.
  assert.equal((await handleLead(valid({ email: "" }), meta, deps())).status, 200);
});

test("same phone within 7 days updates the existing lead instead of inserting", async () => {
  const first = await handleLead(valid(), meta, deps());
  const second = await handleLead(
    valid({ phone: "+91 98765 43210", name: "Asha V", email: "", city: "", role: "working_engineer" }),
    { ...meta, ip: "198.51.100.1" },
    deps()
  );
  assert.equal(second.status, 200);
  assert.ok("ok" in first.body && "ok" in second.body);
  assert.equal(second.body.leadId, first.body.leadId);
  assert.equal(second.body.duplicate, true);
  assert.equal(await leadCount(), 1);
  const { rows } = await db.query<Record<string, unknown>>("select * from public.leads");
  assert.equal(rows[0].name, "Asha V");
  assert.equal(rows[0].role, "working_engineer");
  assert.equal(rows[0].email, "asha@example.com", "blank optional field keeps the old value");
  assert.equal(rows[0].city, "Delhi");
  assert.equal(rows[0].submissions, 2);
});

test("same phone after 7 days creates a new lead", async () => {
  await handleLead(valid(), meta, deps());
  await db.exec("update public.leads set created_at = now() - interval '8 days'");
  const res = await handleLead(valid(), { ...meta, ip: "198.51.100.2" }, deps());
  assert.ok("ok" in res.body && !res.body.duplicate);
  assert.equal(await leadCount(), 2);
});

test("honeypot filled is rejected", async () => {
  const res = await handleLead(valid({ website: "http://spam.example" }), meta, deps());
  assert.equal(res.status, 400);
  assert.equal(await leadCount(), 0);
});

test("missing or failed Turnstile is rejected", async () => {
  assert.equal((await handleLead(valid({ turnstileToken: "" }), meta, deps())).status, 400);
  assert.equal((await handleLead(valid({ turnstileToken: "bot" }), meta, deps())).status, 400);
  assert.equal(await leadCount(), 0);
});

test("rate limit: 6th submission from one IP within 10 minutes gets 429", async () => {
  for (let i = 0; i < 5; i++) {
    const res = await handleLead(valid({ phone: `98765432${10 + i}` }), meta, deps());
    assert.equal(res.status, 200, `submission ${i + 1}`);
  }
  const blocked = await handleLead(valid({ phone: "9876543299" }), meta, deps());
  assert.equal(blocked.status, 429);
  assert.equal(await leadCount(), 5);
  // Another IP is unaffected.
  assert.equal((await handleLead(valid({ phone: "9876543298" }), { ...meta, ip: "198.51.100.9" }, deps())).status, 200);
  // And the window expires.
  await db.exec("update public.lead_submissions set created_at = now() - interval '11 minutes'");
  assert.equal((await handleLead(valid({ phone: "9876543297" }), meta, deps())).status, 200);
});

test("Sheet webhook receives the expected payload and secret", async () => {
  await handleLead(valid(), meta, deps());
  await Promise.all(background);
  assert.equal(sheetCalls.length, 1);
  const call = sheetCalls[0];
  assert.equal(call.url, "https://sheet.test/exec");
  assert.equal((call.init.headers as Record<string, string>)["X-Sheet-Secret"], "s3cret");
  const payload = JSON.parse(String(call.init.body));
  assert.equal(payload.secret, "s3cret");
  assert.deepEqual(Object.keys(payload.lead).sort(), [
    "attended", "cad", "city", "createdAt", "demoBooked", "duplicate", "email", "id", "name", "notes",
    "org", "paid", "phone", "role", "source", "utmCampaign", "utmContent", "utmSource",
  ]);
  assert.equal(payload.lead.phone, "+919876543210");
  assert.equal(payload.lead.role, "Student");
  assert.equal(payload.lead.cad, "SolidWorks, Creo");
  assert.equal(payload.lead.utmCampaign, "ansys_launch");
  assert.equal(payload.lead.demoBooked, true);
});

test("Sheet failure doesn't block the save, and is retried once", async () => {
  sheetResponses = [() => new Response("boom", { status: 500 }), () => new Response('{"ok":false}', { status: 200 })];
  const logs: unknown[][] = [];
  const res = await handleLead(valid(), meta, deps({ log: (...a) => logs.push(a) }));
  assert.equal(res.status, 200, "responds before the Sheet is tried");
  assert.equal(await leadCount(), 1);
  await Promise.all(background);
  assert.equal(sheetCalls.length, 2, "one retry");
  assert.ok(logs.some((l) => String(l[0]).includes("Sheet attempt 2 failed")));
});

test("Sheet network error is retried and succeeds on the second try", async () => {
  sheetResponses = [
    () => {
      throw new TypeError("network down");
    },
  ];
  await handleLead(valid(), meta, deps());
  await Promise.all(background);
  assert.equal(sheetCalls.length, 2);
});

test("a paid Razorpay order marks the buyer's lead paid (by phone or email)", async () => {
  await handleLead(valid(), meta, deps());
  await handleLead(valid({ phone: "9123456780", email: "other@example.com" }), { ...meta, ip: "198.51.100.3" }, deps());
  await db.exec(`
    insert into public.profiles (id, email, phone) values ('00000000-0000-0000-0000-000000000001', 'someone@else.com', '+91-98765 43210');
    insert into public.payments (user_id) values ('00000000-0000-0000-0000-000000000001');
    update public.payments set status = 'paid';
  `);
  const { rows } = await db.query<{ phone: string; paid: boolean; status: string }>(
    "select phone, paid, status from public.leads order by phone"
  );
  assert.deepEqual(rows, [
    { phone: "+919123456780", paid: false, status: "new" },
    { phone: "+919876543210", paid: true, status: "paid" },
  ]);
});
