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

// Metadata here lands in auth.users.raw_user_meta_data, which the
// handle_new_user() DB trigger reads to populate the profiles row —
// see supabase/migrations/20260816120100_functions_and_triggers.sql.
export async function signUp(input: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone,
        user_type: input.userType,
        experience: input.experience,
        interested_courses: input.interestedCourses,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
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
