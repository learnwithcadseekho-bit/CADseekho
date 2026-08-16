import { supabase } from "@/lib/supabaseClient";
import type { CourseDetail, CourseWithCategory } from "@/types/course";

export async function getFeaturedCourses(): Promise<CourseWithCategory[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, category:categories(name, slug)")
    .eq("is_featured", true)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as CourseWithCategory[];
}

export async function getPublishedCourses(): Promise<CourseWithCategory[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, category:categories(name, slug)")
    .eq("is_published", true)
    .order("title");

  if (error) throw error;
  return (data ?? []) as unknown as CourseWithCategory[];
}

export async function getCoursesByCategorySlug(categorySlug: string): Promise<CourseWithCategory[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, category:categories!inner(name, slug)")
    .eq("is_published", true)
    .eq("category.slug", categorySlug)
    .order("title");

  if (error) throw error;
  return (data ?? []) as unknown as CourseWithCategory[];
}

export async function getCourseDetailBySlug(slug: string): Promise<CourseDetail | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, category:categories(name, slug), course_modules(*), course_skills(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const detail = data as unknown as CourseDetail;
  detail.course_modules = [...detail.course_modules].sort((a, b) => a.order_number - b.order_number);
  return detail;
}
