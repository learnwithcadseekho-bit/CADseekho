import { supabase } from "@/lib/supabaseClient";
import type { CourseTestimonial } from "@/types/course";

export async function listTestimonialsByCourse(courseId: string): Promise<CourseTestimonial[]> {
  const { data, error } = await supabase
    .from("course_testimonials")
    .select("*")
    .eq("course_id", courseId)
    .order("order_number");
  if (error) throw error;
  return (data ?? []) as CourseTestimonial[];
}

export async function createTestimonial(input: {
  course_id: string;
  student_name: string;
  student_photo: string | null;
  testimonial: string;
  order_number: number;
}): Promise<CourseTestimonial> {
  const { data, error } = await supabase.from("course_testimonials").insert(input).select("*").single();
  if (error) throw error;
  return data as CourseTestimonial;
}

export async function updateTestimonial(
  id: string,
  input: Partial<Pick<CourseTestimonial, "student_name" | "student_photo" | "testimonial" | "order_number">>
): Promise<CourseTestimonial> {
  const { data, error } = await supabase
    .from("course_testimonials")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CourseTestimonial;
}

export async function deleteTestimonial(id: string): Promise<void> {
  const { error } = await supabase.from("course_testimonials").delete().eq("id", id);
  if (error) throw error;
}
