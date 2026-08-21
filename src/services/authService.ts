import { supabase } from "@/lib/supabaseClient";
import type { ExperienceLevel, InterestedCourseSlug, UserType } from "@/types/profile";

export interface SignUpInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  userType: UserType;
  experience: ExperienceLevel;
  interestedCourses: InterestedCourseSlug[];
}

interface SignupFunctionResponse {
  error?: string;
  user?: unknown;
  session?: { access_token: string; refresh_token: string } | null;
}

// Routes through the signup-with-turnstile Edge Function, which verifies the
// Cloudflare Turnstile token before proxying to Supabase's real /signup
// endpoint — see supabase/functions/signup-with-turnstile/index.ts. Metadata
// still lands in auth.users.raw_user_meta_data, read by the handle_new_user()
// DB trigger to populate the profiles row (see
// supabase/migrations/20260816120100_functions_and_triggers.sql).
export async function signUp(input: SignUpInput, turnstileToken: string) {
  const { data, error } = await supabase.functions.invoke<SignupFunctionResponse>("signup-with-turnstile", {
    body: {
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      phone: input.phone,
      userType: input.userType,
      experience: input.experience,
      interestedCourses: input.interestedCourses,
      turnstileToken,
    },
  });

  if (error) throw error;
  if (!data || data.error) throw new Error(data?.error ?? "Signup failed.");

  // The function only returns tokens (never a full SDK session object), so
  // the client session must be established explicitly here.
  if (data.session) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessionError) throw sessionError;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Requires the Google provider to be configured in Supabase Auth (Dashboard →
// Authentication → Providers) with a Google Cloud OAuth client — see README.
// The DB's handle_new_user() trigger still fires for Google sign-ins; Google
// populates full_name in user metadata automatically, so profiles get a name
// without any extra handling here.
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
