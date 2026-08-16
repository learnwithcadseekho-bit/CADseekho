import { supabase } from "@/lib/supabaseClient";
import type { CourseModule } from "@/types/course";

export async function listModulesByCourse(courseId: string): Promise<CourseModule[]> {
  const { data, error } = await supabase
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_number");
  if (error) throw error;
  return (data ?? []) as CourseModule[];
}

export async function createModule(input: {
  course_id: string;
  title: string;
  description: string | null;
  order_number: number;
}): Promise<CourseModule> {
  const { data, error } = await supabase.from("course_modules").insert(input).select("*").single();
  if (error) throw error;
  return data as CourseModule;
}

export async function updateModule(
  id: string,
  input: Partial<Pick<CourseModule, "title" | "description" | "order_number">>
): Promise<CourseModule> {
  const { data, error } = await supabase
    .from("course_modules")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CourseModule;
}

export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabase.from("course_modules").delete().eq("id", id);
  if (error) throw error;
}
