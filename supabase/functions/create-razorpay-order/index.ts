// Creates a Razorpay order for a course. The amount is always worked out
// here on the server — the client sends only the course (id or slug), so the
// price can't be tampered with in the browser:
//   * SOLIDWORKS Simulation courses (Level 1 / Level 2 / Combo): price and
//     salesOpen from _shared/sw-simulation.config.json — while sales are
//     closed no order can be created, whatever the client sends.
//   * every other course: courses.price.
//
// Deploy: supabase functions deploy create-razorpay-order
// Secrets:
//   supabase secrets set RAZORPAY_KEY_ID=rzp_test_...   (rzp_live_... in production)
//   supabase secrets set RAZORPAY_KEY_SECRET=<key secret>

import { corsHeaders, getCallerId, json, rest } from "../_shared/razorpay.ts";
import swSimConfig from "../_shared/sw-simulation.config.json" with { type: "json" };
import { swSimCheckout, type SwSimConfig } from "../_shared/swSimulationPricing.ts";

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  is_published: boolean;
  seat_capacity: number | null;
  registration_count: number;
  manual_enrolled_count: number | null;
}

const COURSE_COLUMNS = "id,slug,title,price,is_published,seat_capacity,registration_count,manual_enrolled_count";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const userId = await getCallerId(req);
  if (!userId) return json({ error: "Please sign in to enroll." }, 401);

  let courseId: unknown;
  let courseSlug: unknown;
  try {
    ({ courseId, courseSlug } = await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const byId = typeof courseId === "string" && courseId !== "";
  const bySlug = typeof courseSlug === "string" && courseSlug !== "";
  if (!byId && !bySlug) return json({ error: "Invalid request." }, 400);

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.");
    return json({ error: "Payments are temporarily unavailable." }, 500);
  }

  const filter = byId ? `id=eq.${encodeURIComponent(courseId as string)}` : `slug=eq.${encodeURIComponent(courseSlug as string)}`;
  const courseRes = await rest(`courses?${filter}&select=${COURSE_COLUMNS}`);
  const [course] = (await courseRes.json()) as CourseRow[];
  if (!course) return json({ error: "This course isn't available for online payment." }, 400);

  // Config-managed courses may be sold while unpublished (Level 2 pre-order, the Combo bundle).
  const sw = swSimCheckout(swSimConfig as SwSimConfig, course.slug);
  if (sw && !sw.ok) return json({ error: sw.error }, 400);
  if (!sw && (!course.is_published || course.price == null || course.price <= 0)) {
    return json({ error: "This course isn't available for online payment." }, 400);
  }

  const regRes = await rest(`course_registrations?course_id=eq.${course.id}&user_id=eq.${userId}&select=status`);
  const [registration] = (await regRes.json()) as { status: string }[];
  if (registration?.status === "enrolled") {
    return json({ error: "You're already enrolled in this course." }, 409);
  }

  // Someone with an existing registration already holds a counted seat.
  if (!registration && course.seat_capacity != null) {
    const enrolled = Math.max(course.registration_count, course.manual_enrolled_count ?? 0);
    if (enrolled >= course.seat_capacity) {
      return json({ error: "This batch is full." }, 409);
    }
  }

  const amount = sw ? sw.amountPaise : Math.round(course.price! * 100);
  // Razorpay's minimum order is ₹1 (100 paise).
  if (amount < 100) return json({ error: "This course isn't available for online payment." }, 400);

  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      // Razorpay caps receipt at 40 chars.
      receipt: `c_${course.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: userId, course_id: course.id },
    }),
  });
  if (!orderRes.ok) {
    console.error("Razorpay order creation failed:", await orderRes.text());
    return json({ error: "Couldn't start checkout. Please try again." }, 502);
  }
  const order = await orderRes.json();

  const insertRes = await rest("payments", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      course_id: course.id,
      razorpay_order_id: order.id,
      amount,
      currency: "INR",
    }),
  });
  if (!insertRes.ok) {
    console.error("Failed to record payment row:", await insertRes.text());
    return json({ error: "Couldn't start checkout. Please try again." }, 500);
  }

  return json({
    keyId,
    orderId: order.id,
    amount,
    currency: "INR",
    courseTitle: course.title,
  });
});
