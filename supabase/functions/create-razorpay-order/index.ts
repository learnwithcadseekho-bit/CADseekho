// Creates a Razorpay order for a course. The amount is always read from
// courses.price here on the server — the client sends only the course id,
// so the price can't be tampered with in the browser.
//
// Deploy: supabase functions deploy create-razorpay-order
// Secrets:
//   supabase secrets set RAZORPAY_KEY_ID=rzp_test_...   (rzp_live_... in production)
//   supabase secrets set RAZORPAY_KEY_SECRET=<key secret>

import { corsHeaders, getCallerId, json, rest } from "../_shared/razorpay.ts";

interface CourseRow {
  id: string;
  title: string;
  price: number | null;
  seat_capacity: number | null;
  registration_count: number;
  manual_enrolled_count: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const userId = await getCallerId(req);
  if (!userId) return json({ error: "Please sign in to enroll." }, 401);

  let courseId: string;
  try {
    ({ courseId } = await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (typeof courseId !== "string" || !courseId) return json({ error: "Invalid request." }, 400);

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.");
    return json({ error: "Payments are temporarily unavailable." }, 500);
  }

  const [courseRes, regRes] = await Promise.all([
    rest(
      `courses?id=eq.${encodeURIComponent(courseId)}&is_published=eq.true` +
        "&select=id,title,price,seat_capacity,registration_count,manual_enrolled_count"
    ),
    rest(
      `course_registrations?course_id=eq.${encodeURIComponent(courseId)}` +
        `&user_id=eq.${userId}&select=status`
    ),
  ]);
  const [course] = (await courseRes.json()) as CourseRow[];
  const [registration] = (await regRes.json()) as { status: string }[];

  if (!course || course.price == null || course.price <= 0) {
    return json({ error: "This course isn't available for online payment." }, 400);
  }
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

  const amount = Math.round(course.price * 100);
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
