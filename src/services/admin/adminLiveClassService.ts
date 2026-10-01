import { supabase } from "@/lib/supabaseClient";

export interface CourseLiveClass {
  course_id: string;
  zoom_meeting_number: string;
  zoom_passcode: string;
}

export async function getLiveClass(courseId: string): Promise<CourseLiveClass | null> {
  const { data, error } = await supabase
    .from("course_live_classes")
    .select("course_id, zoom_meeting_number, zoom_passcode")
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw error;
  return data as CourseLiveClass | null;
}

export async function saveLiveClass(input: CourseLiveClass): Promise<void> {
  const { error } = await supabase.from("course_live_classes").upsert(input);
  if (error) throw error;
}

export async function deleteLiveClass(courseId: string): Promise<void> {
  const { error } = await supabase.from("course_live_classes").delete().eq("course_id", courseId);
  if (error) throw error;
}
