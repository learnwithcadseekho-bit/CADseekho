// Helpers shared by the Razorpay Edge Functions (create-razorpay-order,
// verify-razorpay-payment, razorpay-webhook).

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time comparison so signature checks don't leak timing.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function serviceHeaders() {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

// Service-role PostgREST call — bypasses RLS, so only use with server-derived input.
export function rest(path: string, init: RequestInit = {}) {
  return fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers ?? {}) },
  });
}

// Resolves the caller's user id from their Supabase access token.
export async function getCallerId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, Authorization: authHeader },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ?? null;
}

export type MarkPaidResult = "paid" | "already_paid" | "unknown_order" | "amount_mismatch";

export async function markPaymentPaid(
  orderId: string,
  paymentId: string,
  amount: number | null
): Promise<MarkPaidResult> {
  const res = await rest("rpc/mark_payment_paid", {
    method: "POST",
    body: JSON.stringify({ p_order_id: orderId, p_payment_id: paymentId, p_amount: amount }),
  });
  if (!res.ok) throw new Error(`mark_payment_paid failed: ${await res.text()}`);
  return (await res.json()) as MarkPaidResult;
}
