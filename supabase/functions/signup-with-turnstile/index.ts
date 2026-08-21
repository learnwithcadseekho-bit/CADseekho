// Verifies a Cloudflare Turnstile token, then proxies to Supabase Auth's own
// /signup REST endpoint (the same call the JS SDK's signUp() makes) so
// email-confirmation behavior stays identical to a direct client call — the
// only difference is user creation is now gated behind bot verification.
//
// Deploy: supabase functions deploy signup-with-turnstile
// Secret:  supabase secrets set TURNSTILE_SECRET_KEY=<your secret key>

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupBody {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  userType: string;
  experience: string;
  interestedCourses: string[];
  turnstileToken: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!body.turnstileToken) {
    return json({ error: "Bot verification is required." });
  }

  // 1. Verify the Turnstile token with Cloudflare.
  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: Deno.env.get("TURNSTILE_SECRET_KEY") ?? "",
      response: body.turnstileToken,
      ...(req.headers.get("cf-connecting-ip")
        ? { remoteip: req.headers.get("cf-connecting-ip")! }
        : {}),
    }),
  });
  const verifyData = await verifyRes.json();

  if (!verifyData.success) {
    return json({ error: "We couldn't verify you're human. Please try again." });
  }

  // 2. Verified — proceed with the real signup, via the same REST endpoint
  //    the Supabase JS SDK calls internally.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const signUpRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      data: {
        full_name: body.fullName,
        phone: body.phone,
        user_type: body.userType,
        experience: body.experience,
        interested_courses: body.interestedCourses,
      },
    }),
  });
  const signUpData = await signUpRes.json();

  if (!signUpRes.ok) {
    return json({ error: signUpData.msg ?? signUpData.error_description ?? "Signup failed." });
  }

  // GoTrue's /signup returns a flat session object when email confirmation
  // is disabled (access_token at top level), or just the user object when a
  // confirmation email is required — normalize to what the frontend expects.
  const hasSession = Boolean(signUpData.access_token);
  return json({
    user: hasSession ? signUpData.user : signUpData,
    session: hasSession
      ? {
          access_token: signUpData.access_token,
          refresh_token: signUpData.refresh_token,
          expires_in: signUpData.expires_in,
          token_type: signUpData.token_type,
          user: signUpData.user,
        }
      : null,
  });
});
