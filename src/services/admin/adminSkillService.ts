import { supabase } from "@/lib/supabaseClient";
import type { CourseSkill } from "@/types/course";

export async function listSkillsByCourse(courseId: string): Promise<CourseSkill[]> {
  const { data, error } = await supabase
    .from("course_skills")
    .select("*")
    .eq("course_id", courseId)
    .order("skill_name");
  if (error) throw error;
  return (data ?? []) as CourseSkill[];
}

export async function createSkill(courseId: string, skillName: string): Promise<CourseSkill> {
  const { data, error } = await supabase
    .from("course_skills")
    .insert({ course_id: courseId, skill_name: skillName })
    .select("*")
    .single();
  if (error) throw error;
  return data as CourseSkill;
}

export async function deleteSkill(id: string): Promise<void> {
  const { error } = await supabase.from("course_skills").delete().eq("id", id);
  if (error) throw error;
}
