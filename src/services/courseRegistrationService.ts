import { supabase } from "@/lib/supabaseClient";

export interface CourseRegistration {
  id: string;
  status: "registered" | "contacted" | "enrolled" | "cancelled";
}

export interface RegistrationWithCourse extends CourseRegistration {
  created_at: string;
  course: { title: string; slug: string; category: { name: string } | null } | null;
}

export async function getRegistration(courseId: string, userId: string): Promise<CourseRegistration | null> {
  const { data, error } = await supabase
    .from("course_registrations")
    .select("id, status")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as CourseRegistration | null;
}

export async function registerForCourse(courseId: string, userId: string): Promise<CourseRegistration> {
  const { data, error } = await supabase
    .from("course_registrations")
    .insert({ course_id: courseId, user_id: userId })
    .select("id, status")
    .single();

  if (error) throw error;
  return data as CourseRegistration;
}

export async function getMyRegistrations(userId: string): Promise<RegistrationWithCourse[]> {
  const { data, error } = await supabase
    .from("course_registrations")
    .select("id, status, created_at, course:courses(title, slug, category:categories(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as RegistrationWithCourse[];
}
