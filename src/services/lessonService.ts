import { supabase } from "@/lib/supabaseClient";
import { cached } from "@/lib/cache";

// Recorded lessons and module downloads. The access rule lives in Postgres
// (public.module_access — see supabase/migrations/20261103090000_course_lessons_and_access.sql);
// nothing here decides who may watch, it only asks.

export interface LessonRow {
  id: string;
  code: string;
  title: string;
  kind: "video" | "quiz" | "problems" | "test";
  duration_minutes: number | null;
  order_number: number;
  is_published: boolean;
}

export interface CourseFileRow {
  id: string;
  title: string;
  storage_path: string;
  order_number: number;
}

export interface ModuleWithLessons {
  id: string;
  code: string | null;
  title: string;
  hours: number | null;
  is_free: boolean;
  is_released: boolean;
  release_label: string | null;
  order_number: number;
  course_lessons: LessonRow[];
  course_files: CourseFileRow[];
}

/** A published course's modules with their lesson list and downloads (titles only — public). */
export async function getCourseSyllabus(courseSlug: string): Promise<ModuleWithLessons[]> {
  return cached(`lessons:syllabus:${courseSlug}`, async () => {
    const { data, error } = await supabase
      .from("course_modules")
      .select(
        "id, code, title, hours, is_free, is_released, release_label, order_number, " +
          "course_lessons(id, code, title, kind, duration_minutes, order_number, is_published), " +
          "course_files(id, title, storage_path, order_number), course:courses!inner(slug)"
      )
      .eq("course.slug", courseSlug)
      .order("order_number");
    if (error) throw error;
    const modules = (data ?? []) as unknown as ModuleWithLessons[];
    for (const m of modules) {
      m.course_lessons = [...m.course_lessons].sort((a, b) => a.order_number - b.order_number);
      m.course_files = [...m.course_files].sort((a, b) => a.order_number - b.order_number);
    }
    return modules;
  });
}

/** Whether the signed-in user (or nobody) may open this module's lessons and files. */
export async function canAccessModule(moduleId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_access_module", { p_module_id: moduleId });
  if (error) throw error;
  return data === true;
}

export interface PlayUrl {
  url: string;
  expires: number;
  lessonCode: string;
}

export type PlayRefusal = "signed_out" | "locked" | "coming_soon" | "no_video" | "not_found" | "error";

/**
 * Signed Bunny embed URL, issued by the lesson-play-url Edge Function after
 * the access check — or why not, so the player can show the right prompt.
 */
export async function getLessonPlayUrl(lessonId: string): Promise<{ ok: true; play: PlayUrl } | { ok: false; code: PlayRefusal; message: string }> {
  const { data, error } = await supabase.functions.invoke<PlayUrl>("lesson-play-url", { body: { lessonId } });
  if (!error && data?.url) return { ok: true, play: data };
  let body: { error?: string; code?: PlayRefusal } = {};
  try {
    body = (await (error as { context?: Response } | null)?.context?.json()) ?? {};
  } catch {
    // not JSON
  }
  return { ok: false, code: body.code ?? "error", message: body.error ?? "Couldn't load this video. Please try again." };
}

/** Short-lived download link. Storage RLS refuses it unless the user may open the module. */
export async function getCourseFileUrl(storagePath: string): Promise<string> {
  const fileName = storagePath.split("/").pop() ?? "download";
  const { data, error } = await supabase.storage.from("course-files").createSignedUrl(storagePath, 120, { download: fileName });
  if (error || !data?.signedUrl) throw new Error("This file isn't available yet.");
  return data.signedUrl;
}
