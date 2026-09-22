// Razorpay webhook: the authoritative "payment succeeded" signal. Verifies
// the X-Razorpay-Signature header (HMAC-SHA256 of the raw body with the
// webhook secret) before doing anything, then enrolls via the idempotent
// mark_payment_paid — Razorpay retries webhooks, and verify-razorpay-payment
// may already have processed the same order, so repeats are no-ops.
//
// Deploy: supabase functions deploy razorpay-webhook --no-verify-jwt
//   (Razorpay can't send a Supabase JWT; config.toml also sets verify_jwt = false)
// Secret:  supabase secrets set RAZORPAY_WEBHOOK_SECRET=<secret set in the Razorpay dashboard>
// Razorpay dashboard → Webhooks: URL
//   https://<project-ref>.supabase.co/functions/v1/razorpay-webhook
//   with events payment.captured and order.paid.

import { hmacSha256Hex, markPaymentPaid, safeEqual } from "../_shared/razorpay.ts";

interface PaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set.");
    return new Response("Not configured", { status: 500 });
  }

  // Signature is over the exact raw bytes — read text before parsing.
  const rawBody = await req.text();
  const signature = req.headers.get("X-Razorpay-Signature") ?? "";
  const expected = await hmacSha256Hex(secret, rawBody);
  if (!signature || !safeEqual(expected, signature)) {
    console.error("Rejected webhook with invalid signature.");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (event.event !== "payment.captured" && event.event !== "order.paid") {
    return new Response("Ignored", { status: 200 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id || payment.status !== "captured") {
    return new Response("Ignored", { status: 200 });
  }

  const result = await markPaymentPaid(payment.order_id, payment.id, payment.amount);
  if (result === "amount_mismatch" || result === "unknown_order") {
    // 200 so Razorpay stops retrying — a retry can't fix either case, it
    // needs a human to look at the payment.
    console.error(`Webhook ${event.event}: ${result} for order ${payment.order_id}, payment ${payment.id}`);
  }

  return new Response("OK", { status: 200 });
});
