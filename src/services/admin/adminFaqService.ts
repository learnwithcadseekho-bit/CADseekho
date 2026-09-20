import { supabase } from "@/lib/supabaseClient";
import type { CourseFaq } from "@/types/course";

export async function listFaqsByCourse(courseId: string): Promise<CourseFaq[]> {
  const { data, error } = await supabase
    .from("course_faqs")
    .select("*")
    .eq("course_id", courseId)
    .order("order_number");
  if (error) throw error;
  return (data ?? []) as CourseFaq[];
}

export async function createFaq(input: {
  course_id: string;
  question: string;
  answer: string;
  order_number: number;
}): Promise<CourseFaq> {
  const { data, error } = await supabase.from("course_faqs").insert(input).select("*").single();
  if (error) throw error;
  return data as CourseFaq;
}

export async function updateFaq(
  id: string,
  input: Partial<Pick<CourseFaq, "question" | "answer" | "order_number">>
): Promise<CourseFaq> {
  const { data, error } = await supabase
    .from("course_faqs")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CourseFaq;
}

export async function deleteFaq(id: string): Promise<void> {
  const { error } = await supabase.from("course_faqs").delete().eq("id", id);
  if (error) throw error;
}
