// Demo-class booking from /ansys-foundation (the launch page's form).
// Checks the honeypot, every field and the Turnstile token, then saves via
// submit_lead() (rate limit per IP + 7-day phone dedupe, see
// supabase/migrations/20261012090000_leads.sql). After responding it syncs
// the lead to the Google Sheet (one retry) and alerts the admin by email
// and/or Telegram — neither can block or undo the save. Logic: ./lead.ts.
//
// Deploy: supabase functions deploy submit-lead
//   (verify_jwt stays on: the site calls it with the public anon key.)
// Secrets (TURNSTILE_SECRET_KEY, RESEND_API_KEY, ADMIN_NOTIFICATION_EMAIL are
// already set for signup/notify-registration):
//   supabase secrets set GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
//   supabase secrets set SHEET_SECRET=<long random string, same as in the Apps Script>
//   supabase secrets set TELEGRAM_BOT_TOKEN=<from @BotFather>  TELEGRAM_CHAT_ID=<your chat id>   (optional)

import { corsHeaders, json, rest } from "../_shared/razorpay.ts";
import { handleLead, type LeadInput, type SaveResult } from "./lead.ts";

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: Deno.env.get("TURNSTILE_SECRET_KEY") ?? "",
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    }),
  });
  if (!res.ok) throw new Error(`siteverify ${res.status}`);
  const data = await res.json();
  if (!data.success) console.error("Turnstile rejected:", JSON.stringify(data));
  return Boolean(data.success);
}

// Salted so the stored hash can't be reversed by hashing every IPv4 address.
async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get("LEAD_IP_SALT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function saveLead(lead: LeadInput, ipHash: string): Promise<SaveResult> {
  const res = await rest("rpc/submit_lead", {
    method: "POST",
    body: JSON.stringify({ p_lead: lead, p_ip_hash: ipHash }),
  });
  if (!res.ok) throw new Error(`submit_lead ${res.status}: ${await res.text()}`);
  return (await res.json()) as SaveResult;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || null;
  const { status, body: out } = await handleLead(
    body,
    { ip, userAgent: req.headers.get("user-agent") },
    {
      verifyTurnstile,
      hashIp,
      saveLead,
      fetch,
      env: {
        sheetWebhookUrl: Deno.env.get("GOOGLE_SHEET_WEBHOOK_URL"),
        sheetSecret: Deno.env.get("SHEET_SECRET"),
        resendApiKey: Deno.env.get("RESEND_API_KEY"),
        adminEmail: Deno.env.get("ADMIN_NOTIFICATION_EMAIL") ?? "info@cadseekho.com",
        telegramBotToken: Deno.env.get("TELEGRAM_BOT_TOKEN"),
        telegramChatId: Deno.env.get("TELEGRAM_CHAT_ID"),
      },
      background: (task) => (typeof EdgeRuntime !== "undefined" ? EdgeRuntime.waitUntil(task) : void task),
      log: console.error,
    }
  );
  return json(out, status);
});
