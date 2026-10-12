// Demo-booking lead handling, kept free of Deno APIs so the same code runs in
// the Edge Function (index.ts) and in the Node tests (tests/submit-lead.test.ts).
// Everything with a side effect comes in through `LeadDeps`.

export const CAD_OPTIONS = ["SolidWorks", "Creo", "CATIA", "AutoCAD", "NX", "None"] as const;
export const ROLES = { student: "Student", working_engineer: "Working engineer", other: "Other" } as const;
/** Stored with every lead as the record of what was agreed to. Must match the form's checkbox label. */
export const CONSENT_TEXT = "I agree to be contacted on WhatsApp/phone about this course";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export interface LeadInput {
  name: string;
  phone: string;
  email: string | null;
  role: keyof typeof ROLES;
  org: string | null;
  city: string | null;
  cad: string[];
  consent_text: string;
  source: string;
  utm: Partial<Record<(typeof UTM_KEYS)[number], string>>;
  gclid: string | null;
  fbclid: string | null;
  page: string | null;
  user_agent: string | null;
}

export type SaveResult = { result: "created" | "updated"; id: string } | { result: "rate_limited" };

export interface LeadEnv {
  sheetWebhookUrl?: string;
  sheetSecret?: string;
  resendApiKey?: string;
  adminEmail: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export interface LeadDeps {
  /** Cloudflare siteverify. true = human, false = rejected; throws if Cloudflare couldn't be reached. */
  verifyTurnstile: (token: string, ip: string | null) => Promise<boolean>;
  hashIp: (ip: string) => Promise<string>;
  /** submit_lead() in Postgres: rate limit + 7-day phone dedupe + insert/update. */
  saveLead: (lead: LeadInput, ipHash: string) => Promise<SaveResult>;
  fetch: typeof fetch;
  env: LeadEnv;
  /** Runs after the response is sent (EdgeRuntime.waitUntil in production). */
  background: (task: Promise<unknown>) => void;
  log: (...args: unknown[]) => void;
  /** Delay before the one Sheet retry. */
  retryDelayMs?: number;
}

export interface LeadResponse {
  status: number;
  body: { ok: true; leadId: string; duplicate: boolean } | { error: string; field?: string };
}

// ---------------------------------------------------------------------------
// Validation

/** Indian mobile → "+91XXXXXXXXXX". Accepts 10 digits, or a +91 / 91 / 0 prefix, with spaces or dashes. */
export function normaliseIndianMobile(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function optionalText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

type Invalid = { error: string; field: string };

export function validateLead(body: Record<string, unknown>, userAgent: string | null): LeadInput | Invalid {
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 2 || name.length > 60) return { field: "name", error: "Please enter your name (2–60 characters)." };

  const phone = normaliseIndianMobile(body.phone);
  if (!phone) return { field: "phone", error: "Please enter a valid 10-digit Indian mobile number." };

  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (rawEmail && (rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)))
    return { field: "email", error: "Please enter a valid email address, or leave it blank." };

  if (typeof body.role !== "string" || !Object.hasOwn(ROLES, body.role))
    return { field: "role", error: "Please tell us whether you're a student or a working engineer." };

  const cadIn = Array.isArray(body.cad) ? body.cad : [];
  if (cadIn.some((c) => !(CAD_OPTIONS as readonly unknown[]).includes(c)))
    return { field: "cad", error: "Please pick the CAD software from the list." };
  const cad = [...new Set(cadIn as string[])];

  if (body.consent !== true)
    return { field: "consent", error: "Please tick the box so we can contact you about the demo." };

  const utmIn = (body.utm && typeof body.utm === "object" ? body.utm : {}) as Record<string, unknown>;
  const utm: LeadInput["utm"] = {};
  for (const k of UTM_KEYS) {
    const v = optionalText(utmIn[k], 200);
    if (v) utm[k] = v;
  }

  return {
    name,
    phone,
    email: rawEmail || null,
    role: body.role as LeadInput["role"],
    org: optionalText(body.org, 100),
    city: optionalText(body.city, 60),
    cad,
    consent_text: CONSENT_TEXT,
    source: "website",
    utm,
    gclid: optionalText(utmIn.gclid ?? body.gclid, 200),
    fbclid: optionalText(utmIn.fbclid ?? body.fbclid, 300),
    page: optionalText(body.page, 200),
    user_agent: userAgent ? userAgent.slice(0, 300) : null,
  };
}

// ---------------------------------------------------------------------------
// Request handling

export async function handleLead(
  body: unknown,
  meta: { ip: string | null; userAgent: string | null },
  deps: LeadDeps
): Promise<LeadResponse> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, body: { error: "Invalid request." } };
  const b = body as Record<string, unknown>;

  // Honeypot: a field people never see. Anything in it is a bot.
  if (typeof b.website === "string" && b.website.trim() !== "") {
    deps.log("submit-lead: honeypot filled, rejected");
    return { status: 400, body: { error: "Invalid request." } };
  }

  const lead = validateLead(b, meta.userAgent);
  if ("error" in lead) return { status: 400, body: lead };

  if (typeof b.turnstileToken !== "string" || !b.turnstileToken)
    return { status: 400, body: { error: "Please complete the verification check.", field: "turnstile" } };
  try {
    if (!(await deps.verifyTurnstile(b.turnstileToken, meta.ip)))
      return { status: 400, body: { error: "We couldn't verify you're human. Please try again.", field: "turnstile" } };
  } catch (err) {
    // Cloudflare unreachable: a real lead matters more than a perfect bot
    // check — the honeypot and rate limit still apply.
    deps.log("submit-lead: Turnstile check failed, accepting:", err);
  }

  const ipHash = await deps.hashIp(meta.ip ?? "unknown");
  let saved: SaveResult;
  try {
    saved = await deps.saveLead(lead, ipHash);
  } catch (err) {
    deps.log("submit-lead: save failed:", err);
    return { status: 500, body: { error: "We couldn't save your booking. Please message us on WhatsApp." } };
  }
  if (saved.result === "rate_limited")
    return { status: 429, body: { error: "Too many bookings from this connection. Please try again in a few minutes." } };

  const record = { id: saved.id, duplicate: saved.result === "updated", ...lead };
  // The lead is saved; the Sheet and the alerts must never undo or delay that.
  deps.background(
    Promise.allSettled([syncToSheet(record, deps), alertAdmin(record, deps)]).then((results) => {
      for (const r of results) if (r.status === "rejected") deps.log("submit-lead: follow-up failed:", r.reason);
    })
  );

  return { status: 200, body: { ok: true, leadId: saved.id, duplicate: saved.result === "updated" } };
}

// ---------------------------------------------------------------------------
// Google Sheet sync (scripts/google-sheet-webhook.gs)

type SavedLead = LeadInput & { id: string; duplicate: boolean };

/** The JSON the Apps Script receives. Apps Script can't read request headers, so the secret is in the body too. */
export function sheetPayload(lead: SavedLead, secret: string) {
  return {
    secret,
    lead: {
      id: lead.id,
      createdAt: new Date().toISOString(),
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? "",
      role: ROLES[lead.role],
      org: lead.org ?? "",
      city: lead.city ?? "",
      cad: lead.cad.join(", "),
      source: lead.source,
      utmSource: lead.utm.utm_source ?? "",
      utmCampaign: lead.utm.utm_campaign ?? "",
      utmContent: lead.utm.utm_content ?? "",
      demoBooked: true,
      attended: false,
      paid: false,
      notes: "",
      duplicate: lead.duplicate,
    },
  };
}

export async function syncToSheet(lead: SavedLead, deps: LeadDeps): Promise<"sent" | "skipped" | "failed"> {
  const { sheetWebhookUrl, sheetSecret } = deps.env;
  if (!sheetWebhookUrl || !sheetSecret) return "skipped";
  const body = JSON.stringify(sheetPayload(lead, sheetSecret));
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await deps.fetch(sheetWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sheet-Secret": sheetSecret },
        body,
        redirect: "follow",
      });
      // Apps Script answers 200 even on its own errors — read its { ok } flag.
      const text = await res.text();
      if (res.ok && /"ok"\s*:\s*true/.test(text)) return "sent";
      deps.log(`submit-lead: Sheet attempt ${attempt} failed (${res.status}): ${text.slice(0, 200)}`);
    } catch (err) {
      deps.log(`submit-lead: Sheet attempt ${attempt} failed:`, err);
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, deps.retryDelayMs ?? 1500));
  }
  return "failed";
}

// ---------------------------------------------------------------------------
// Instant alert: email (Resend, same sender as notify-registration) and/or Telegram

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function alertAdmin(lead: SavedLead, deps: LeadDeps): Promise<void> {
  const wa = `https://wa.me/${lead.phone.replace(/\D/g, "")}`;
  const role = ROLES[lead.role];
  const tag = lead.duplicate ? "Repeat demo booking" : "New demo booking";
  const campaign = lead.utm.utm_campaign ? ` · ${lead.utm.utm_campaign}` : "";
  const jobs: Promise<unknown>[] = [];

  if (deps.env.resendApiKey) {
    const rows: [string, string][] = [
      ["Phone", lead.phone],
      ["Role", role],
      ["Email", lead.email ?? "—"],
      ["College / company", lead.org ?? "—"],
      ["City", lead.city ?? "—"],
      ["CAD", lead.cad.join(", ") || "—"],
      ["Source", `${lead.utm.utm_source ?? lead.source}${campaign}`],
    ];
    jobs.push(
      deps
        .fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${deps.env.resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "CADseekho <notifications@cadseekho.com>",
            to: deps.env.adminEmail,
            subject: `${tag}: ${lead.name} (${role})`,
            html:
              `<p><strong>${escapeHtml(lead.name)}</strong> booked the free ANSYS demo.</p><ul>` +
              rows.map(([k, v]) => `<li>${k}: ${escapeHtml(v)}</li>`).join("") +
              `</ul><p><a href="${wa}">WhatsApp ${escapeHtml(lead.name)} →</a></p>`,
          }),
        })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
        })
    );
  }

  if (deps.env.telegramBotToken && deps.env.telegramChatId) {
    jobs.push(
      deps
        .fetch(`https://api.telegram.org/bot${deps.env.telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: deps.env.telegramChatId,
            text: `${tag}\n${lead.name} — ${role}\n${lead.phone}${campaign}\nWhatsApp: ${wa}`,
            disable_web_page_preview: true,
          }),
        })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
        })
    );
  }

  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") deps.log("submit-lead: alert failed:", r.reason);
}
