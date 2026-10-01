// Lets an enrolled student (or an admin) join a course's live class inside the
// site. Checks enrolment, then signs a Zoom Meeting SDK JWT on the server —
// the SDK secret never reaches the browser, and the meeting number/passcode
// are only handed to people allowed in.
//
// Deploy: supabase functions deploy zoom-join
// Secrets (Zoom Marketplace → your Meeting SDK app → App Credentials):
//   supabase secrets set ZOOM_SDK_KEY=<client id>
//   supabase secrets set ZOOM_SDK_SECRET=<client secret>

import { corsHeaders, getCallerId, json, rest } from "../_shared/razorpay.ts";

interface CourseRow {
  id: string;
  title: string;
  live_class_schedule: string | null;
}

interface LiveClassRow {
  zoom_meeting_number: string;
  zoom_passcode: string;
}

function base64Url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Meeting SDK JWT — https://developers.zoom.us/docs/meeting-sdk/auth/
// role 0 = attendee. The host starts the class from the normal Zoom app.
async function signMeetingSdkJwt(sdkKey: string, sdkSecret: string, meetingNumber: string) {
  const iat = Math.floor(Date.now() / 1000) - 30; // small allowance for clock skew
  const exp = iat + 2 * 60 * 60; // Zoom's minimum is 30 min; 2 h covers a long class
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ appKey: sdkKey, sdkKey, mn: meetingNumber, role: 0, iat, exp, tokenExp: exp })
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sdkSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64Url(new Uint8Array(sig))}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const userId = await getCallerId(req);
  if (!userId) return json({ error: "Please sign in to join the class." }, 401);

  let slug: string;
  try {
    ({ slug } = await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (typeof slug !== "string" || !slug) return json({ error: "Invalid request." }, 400);

  const courseRes = await rest(
    `courses?slug=eq.${encodeURIComponent(slug)}&select=id,title,live_class_schedule`
  );
  const [course] = (await courseRes.json()) as CourseRow[];
  if (!course) return json({ error: "Course not found." }, 404);

  const [regRes, profileRes, liveRes] = await Promise.all([
    rest(`course_registrations?course_id=eq.${course.id}&user_id=eq.${userId}&select=status`),
    rest(`profiles?id=eq.${userId}&select=full_name,email,role`),
    rest(`course_live_classes?course_id=eq.${course.id}&select=zoom_meeting_number,zoom_passcode`),
  ]);
  const [registration] = (await regRes.json()) as { status: string }[];
  const [profile] = (await profileRes.json()) as { full_name: string; email: string; role: string }[];
  const [live] = (await liveRes.json()) as LiveClassRow[];

  if (registration?.status !== "enrolled" && profile?.role !== "admin") {
    return json({ error: "The live class is only open to students enrolled in this course." }, 403);
  }
  if (!live) {
    return json({ error: "The live class for this course hasn't been set up yet." }, 404);
  }

  const sdkKey = Deno.env.get("ZOOM_SDK_KEY");
  const sdkSecret = Deno.env.get("ZOOM_SDK_SECRET");
  if (!sdkKey || !sdkSecret) {
    console.error("ZOOM_SDK_KEY / ZOOM_SDK_SECRET are not set.");
    return json({ error: "Live classes are temporarily unavailable." }, 500);
  }

  return json({
    courseTitle: course.title,
    schedule: course.live_class_schedule,
    signature: await signMeetingSdkJwt(sdkKey, sdkSecret, live.zoom_meeting_number),
    meetingNumber: live.zoom_meeting_number,
    password: live.zoom_passcode,
    // The name the teacher sees in the participant list and waiting room.
    userName: profile?.full_name?.trim() || profile?.email || "Student",
    userEmail: profile?.email ?? "",
  });
});
