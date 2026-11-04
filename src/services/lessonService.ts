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
  /** 'problems' → the player's Problems tab; 'resource' → Resources. */
  kind: "resource" | "problems";
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
          "course_files(id, title, storage_path, order_number, kind), course:courses!inner(slug)"
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
  /** Saved position in seconds (0 = start). */
  resumeAt: number;
}

export type PlayRefusal = "signed_out" | "locked" | "coming_soon" | "no_video" | "processing" | "not_found" | "error";

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

// ---------------------------------------------------------------------------
// Player outline, progress, My Learning, purchases — all decided in Postgres
// (supabase/migrations/20261104090000_recorded_course_player.sql).

/** Per-lesson state for the signed-in user, from public.course_outline. */
export type LessonState = "open" | "locked" | "signin" | "coming_soon" | "processing";

export interface OutlineLesson {
  id: string;
  code: string;
  title: string;
  kind: "video" | "quiz" | "problems" | "test";
  description: string | null;
  durationMinutes: number | null;
  durationSec: number | null;
  state: LessonState;
  completed: boolean;
  positionSec: number;
}

export interface OutlineModule {
  id: string;
  code: string | null;
  title: string;
  isFree: boolean;
  released: boolean;
  releaseLabel: string | null;
  lessons: OutlineLesson[];
}

export interface CourseOutline {
  courseId: string;
  courseTitle: string;
  modules: OutlineModule[];
}

interface OutlineRow {
  course_id: string;
  course_title: string;
  module_id: string;
  module_code: string | null;
  module_title: string;
  module_is_free: boolean;
  module_released: boolean;
  release_label: string | null;
  lesson_id: string | null;
  lesson_code: string | null;
  lesson_title: string | null;
  lesson_kind: OutlineLesson["kind"] | null;
  lesson_description: string | null;
  duration_minutes: number | null;
  duration_sec: number | null;
  state: LessonState | null;
  completed: boolean;
  position_sec: number;
}

/** null when the course doesn't exist or isn't published. Not cached: it changes as the user watches. */
export async function getCourseOutline(courseSlug: string): Promise<CourseOutline | null> {
  const { data, error } = await supabase.rpc("course_outline", { p_course_slug: courseSlug });
  if (error) throw error;
  const rows = (data ?? []) as OutlineRow[];
  if (rows.length === 0) return null;
  const modules: OutlineModule[] = [];
  for (const r of rows) {
    let m = modules.at(-1);
    if (!m || m.id !== r.module_id) {
      m = {
        id: r.module_id,
        code: r.module_code,
        title: r.module_title,
        isFree: r.module_is_free,
        released: r.module_released,
        releaseLabel: r.release_label,
        lessons: [],
      };
      modules.push(m);
    }
    if (r.lesson_id && r.lesson_code && r.lesson_title && r.lesson_kind && r.state) {
      m.lessons.push({
        id: r.lesson_id,
        code: r.lesson_code,
        title: r.lesson_title,
        kind: r.lesson_kind,
        description: r.lesson_description,
        durationMinutes: r.duration_minutes,
        durationSec: r.duration_sec,
        state: r.state,
        completed: r.completed,
        positionSec: r.position_sec,
      });
    }
  }
  return { courseId: rows[0].course_id, courseTitle: rows[0].course_title, modules };
}

/**
 * Save the watch position. completed: true/false marks or un-marks the
 * lesson; omit it to let the server mark it at 90%.
 */
export async function saveLessonProgress(
  lessonId: string,
  positionSec: number,
  opts: { durationSec?: number | null; completed?: boolean | null } = {}
): Promise<{ positionSec: number; completed: boolean }> {
  const { data, error } = await supabase.rpc("save_lesson_progress", {
    p_lesson_id: lessonId,
    p_position_sec: Math.max(0, Math.floor(positionSec)),
    p_duration_sec: opts.durationSec ? Math.round(opts.durationSec) : null,
    p_completed: opts.completed ?? null,
  });
  if (error) throw error;
  const row = (data as { position_sec: number; completed: boolean }[] | null)?.[0];
  return { positionSec: row?.position_sec ?? 0, completed: row?.completed ?? false };
}

export interface LearningCard {
  courseId: string;
  slug: string;
  title: string;
  level: string | null;
  access: "enrolled" | "expired" | "preview" | "admin";
  expiresAt: string | null;
  totalLessons: number;
  completedLessons: number;
  nextLessonCode: string | null;
  nextLessonTitle: string | null;
  nextPositionSec: number;
}

export async function getMyLearning(): Promise<LearningCard[]> {
  const { data, error } = await supabase.rpc("my_learning");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    courseId: r.course_id as string,
    slug: r.slug as string,
    title: r.title as string,
    level: (r.level as string | null) ?? null,
    access: r.access as LearningCard["access"],
    expiresAt: (r.expires_at as string | null) ?? null,
    totalLessons: Number(r.total_lessons ?? 0),
    completedLessons: Number(r.completed_lessons ?? 0),
    nextLessonCode: (r.next_lesson_code as string | null) ?? null,
    nextLessonTitle: (r.next_lesson_title as string | null) ?? null,
    nextPositionSec: Number(r.next_position_sec ?? 0),
  }));
}

export interface Purchase {
  orderId: string;
  paymentId: string | null;
  courseTitle: string;
  amountPaise: number;
  currency: string;
  paidAt: string;
}

export async function getMyPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase.rpc("my_purchases");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    orderId: r.razorpay_order_id as string,
    paymentId: (r.razorpay_payment_id as string | null) ?? null,
    courseTitle: r.course_title as string,
    amountPaise: Number(r.amount),
    currency: (r.currency as string) ?? "INR",
    paidAt: r.paid_at as string,
  }));
}

/** /learn/<course>/<lesson code> */
export const learnPath = (courseSlug: string, lessonCode?: string | null) =>
  `/learn/${courseSlug}${lessonCode ? `/${encodeURIComponent(lessonCode)}` : ""}`;

/** Short-lived download link. Storage RLS refuses it unless the user may open the module. */
export async function getCourseFileUrl(storagePath: string): Promise<string> {
  const fileName = storagePath.split("/").pop() ?? "download";
  const { data, error } = await supabase.storage.from("course-files").createSignedUrl(storagePath, 120, { download: fileName });
  if (error || !data?.signedUrl) throw new Error("This file isn't available yet.");
  return data.signedUrl;
}
