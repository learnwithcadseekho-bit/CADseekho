// Called by the browser from Razorpay Checkout's success handler so the
// student sees "Enrolled" immediately instead of waiting for the webhook.
// It verifies Razorpay's checkout signature (HMAC of order_id|payment_id
// with the key secret) — the order's amount was fixed server-side in
// create-razorpay-order, so a valid signature means that amount was paid.
// razorpay-webhook remains the source of truth if the browser never gets
// here (tab closed, network drop); mark_payment_paid makes the two safe to
// race.
//
// Deploy: supabase functions deploy verify-razorpay-payment
// Secret:  RAZORPAY_KEY_SECRET (shared with create-razorpay-order)

import { corsHeaders, getCallerId, hmacSha256Hex, json, markPaymentPaid, rest, safeEqual } from "../_shared/razorpay.ts";

interface VerifyBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const userId = await getCallerId(req);
  if (!userId) return json({ error: "Please sign in." }, 401);

  let body: VerifyBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;
  if (!orderId || !paymentId || !signature) return json({ error: "Invalid request." }, 400);

  const expected = await hmacSha256Hex(Deno.env.get("RAZORPAY_KEY_SECRET") ?? "", `${orderId}|${paymentId}`);
  if (!safeEqual(expected, signature)) {
    console.error("Checkout signature mismatch for order", orderId);
    return json({ error: "Payment verification failed." }, 400);
  }

  // The order must belong to the caller — a valid signature alone doesn't
  // stop someone replaying another user's handler payload.
  const ownerRes = await rest(
    `payments?razorpay_order_id=eq.${encodeURIComponent(orderId)}&user_id=eq.${userId}&select=id`
  );
  const [owned] = await ownerRes.json();
  if (!owned) return json({ error: "Payment verification failed." }, 403);

  const result = await markPaymentPaid(orderId, paymentId, null);
  if (result !== "paid" && result !== "already_paid") {
    console.error("mark_payment_paid returned", result, "for order", orderId);
    return json({ error: "Payment verification failed." }, 400);
  }

  return json({ status: "enrolled" });
});
