// Sends registration notification emails (to the admin and to the student)
// when a row is inserted into course_registrations, or when an existing
// registration becomes 'enrolled' (paid via Razorpay, or confirmed by an admin). Triggered by a Supabase
// Database Webhook on course_registrations (INSERT) — the webhook is
// dashboard-configured, not a migration, since it needs this function's
// deployed URL. See the setup steps in CONTENT-GUIDE.md or ask Claude.
//
// Deploy: supabase functions deploy notify-registration
// Secrets:
//   supabase secrets set RESEND_API_KEY=<your Resend API key>
//   supabase secrets set ADMIN_NOTIFICATION_EMAIL=info@cadseekho.com
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Supabase platform — no need to set those as secrets.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrationWebhookPayload {
  type: string;
  table: string;
  record: {
    id: string;
    user_id: string;
    course_id: string;
    status?: string;
  };
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CADseekho <notifications@cadseekho.com>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error(`Failed to send email to ${to}: ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let payload: RegistrationWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (payload.table !== "course_registrations" || (payload.type !== "INSERT" && payload.type !== "UPDATE")) {
    return new Response("Ignored", { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") ?? "info@cadseekho.com";

  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not set — skipping notification.");
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const { user_id, course_id } = payload.record;
  const restHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  const [profileRes, courseRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user_id}&select=full_name,email,phone`, {
      headers: restHeaders,
    }),
    fetch(`${supabaseUrl}/rest/v1/courses?id=eq.${course_id}&select=title,price`, {
      headers: restHeaders,
    }),
  ]);

  const [profile] = await profileRes.json();
  const [course] = await courseRes.json();

  if (!profile || !course) {
    console.error("Missing profile or course for registration", payload.record);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const studentName = profile.full_name || "A student";

  if (payload.record.status === "enrolled") {
    await Promise.all([
      sendEmail(
        resendApiKey,
        adminEmail,
        `Enrolled: ${course.title}`,
        `<p><strong>${studentName}</strong> is now enrolled in <strong>${course.title}</strong>.</p>
         <ul>
           <li>Email: ${profile.email}</li>
           <li>Phone: ${profile.phone ?? "—"}</li>
         </ul>
         <p>Add them to the matching Graphy batch.</p>`
      ),
      sendEmail(
        resendApiKey,
        profile.email,
        `You're enrolled in ${course.title}`,
        `<p>Hi ${studentName},</p>
         <p>Your enrollment in <strong>${course.title}</strong> on CADseekho is confirmed. We'll send your class access details shortly.</p>
         <p>— Team CADseekho</p>`
      ),
    ]);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  if (payload.type !== "INSERT") {
    return new Response("Ignored", { status: 200, headers: corsHeaders });
  }

  await Promise.all([
    sendEmail(
      resendApiKey,
      adminEmail,
      `New registration: ${course.title}`,
      `<p><strong>${studentName}</strong> just registered for <strong>${course.title}</strong>.</p>
       <ul>
         <li>Email: ${profile.email}</li>
         <li>Phone: ${profile.phone ?? "—"}</li>
         <li>Price: ${course.price != null ? `₹${course.price}` : "not set"}</li>
       </ul>
       <p>Add them to the matching Graphy batch once payment is confirmed.</p>`
    ),
    sendEmail(
      resendApiKey,
      profile.email,
      `You're registered for ${course.title}`,
      `<p>Hi ${studentName},</p>
       <p>Thanks for registering for <strong>${course.title}</strong> on CADseekho. We'll reach out shortly with payment and class access details.</p>
       <p>— Team CADseekho</p>`
    ),
  ]);

  return new Response("OK", { status: 200, headers: corsHeaders });
});
