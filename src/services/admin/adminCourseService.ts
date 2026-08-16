import { supabase } from "@/lib/supabaseClient";
import type { Course, CourseWithCategory } from "@/types/course";

export async function listAllCourses(): Promise<CourseWithCategory[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, category:categories(name, slug)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CourseWithCategory[];
}

export async function getCourseById(id: string): Promise<Course | null> {
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Course | null;
}

export type CourseInput = Pick<
  Course,
  | "category_id"
  | "title"
  | "slug"
  | "short_description"
  | "description"
  | "level"
  | "software"
  | "prerequisites"
  | "image"
  | "format"
  | "is_featured"
  | "is_published"
>;

export async function createCourse(input: CourseInput): Promise<Course> {
  const { data, error } = await supabase.from("courses").insert(input).select("*").single();
  if (error) throw error;
  return data as Course;
}

export async function updateCourse(id: string, input: Partial<CourseInput>): Promise<Course> {
  const { data, error } = await supabase.from("courses").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Course;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}
