import { supabase } from "@/lib/supabaseClient";

// Admin: recorded lessons, their Bunny video ids, module release flags and
// module downloads. RLS allows all of this for admins only.

export interface AdminLesson {
  id: string;
  code: string;
  title: string;
  kind: string;
  duration_minutes: number | null;
  order_number: number;
  is_published: boolean;
  description: string | null;
  bunny_video_id: string | null;
  encode_status: EncodeStatus | null;
  duration_sec: number | null;
}

export type EncodeStatus = "none" | "processing" | "ready" | "failed";

export interface AdminCourseFile {
  id: string;
  title: string;
  storage_path: string;
  order_number: number;
  kind: "resource" | "problems";
}

export interface AdminLessonModule {
  id: string;
  code: string | null;
  title: string;
  order_number: number;
  is_free: boolean;
  is_released: boolean;
  release_label: string | null;
  lessons: AdminLesson[];
  files: AdminCourseFile[];
}

type VideoRow = { bunny_video_id: string; encode_status: EncodeStatus; duration_sec: number | null };
type Row = Omit<AdminLessonModule, "lessons" | "files"> & {
  course_lessons: (Omit<AdminLesson, "bunny_video_id" | "encode_status" | "duration_sec"> & {
    course_lesson_videos: VideoRow | VideoRow[] | null;
  })[];
  course_files: AdminCourseFile[];
};

export async function listLessonModules(courseId: string): Promise<AdminLessonModule[]> {
  const { data, error } = await supabase
    .from("course_modules")
    .select(
      "id, code, title, order_number, is_free, is_released, release_label, " +
        "course_lessons(id, code, title, kind, duration_minutes, order_number, is_published, description, " +
        "course_lesson_videos(bunny_video_id, encode_status, duration_sec)), " +
        "course_files(id, title, storage_path, order_number, kind)"
    )
    .eq("course_id", courseId)
    .order("order_number");
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(({ course_lessons, course_files, ...m }) => ({
    ...m,
    lessons: course_lessons
      .map(({ course_lesson_videos: v, ...l }) => {
        const video = Array.isArray(v) ? v[0] : v;
        return {
          ...l,
          bunny_video_id: video?.bunny_video_id ?? null,
          encode_status: video?.encode_status ?? null,
          duration_sec: video?.duration_sec ?? null,
        };
      })
      .sort((a, b) => a.order_number - b.order_number),
    files: [...course_files].sort((a, b) => a.order_number - b.order_number),
  }));
}

const BUNNY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pull the video GUID out of whatever was pasted: the bare id, an embed/play URL, or the Bunny dashboard URL. */
export function parseBunnyVideoId(input: string): string | null {
  const match = input.trim().match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
  // Embed URLs are /embed/<library>/<video> — the video id is the last GUID.
  const id = match?.at(-1)?.toLowerCase() ?? null;
  return id && BUNNY_ID.test(id) ? id : null;
}

/** Set (or clear, with null) a lesson's Bunny video id. */
export async function setLessonVideo(lessonId: string, videoId: string | null): Promise<void> {
  if (videoId === null) {
    const { error } = await supabase.from("course_lesson_videos").delete().eq("lesson_id", lessonId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("course_lesson_videos")
    .upsert({ lesson_id: lessonId, bunny_video_id: videoId }, { onConflict: "lesson_id" });
  if (error) throw error;
}

export interface BunnyVideoInfo {
  encode_status: EncodeStatus;
  duration_sec: number | null;
  bunny_status: number;
  title: string | null;
}

/** "Fetch from Bunny": the bunny-video Edge Function reads status + length from Bunny and saves them. */
export async function fetchFromBunny(lessonId: string): Promise<BunnyVideoInfo> {
  const { data, error } = await supabase.functions.invoke<BunnyVideoInfo>("bunny-video", { body: { lessonId } });
  if (!error && data) return data;
  let message = "Couldn't reach Bunny.";
  try {
    message = ((await (error as { context?: Response } | null)?.context?.json()) as { error?: string })?.error ?? message;
  } catch {
    // not JSON
  }
  throw new Error(message);
}

/** Manual override, e.g. before the Bunny API key is set up. */
export async function setVideoStatus(lessonId: string, status: EncodeStatus): Promise<void> {
  const { error } = await supabase
    .from("course_lesson_videos")
    .update({ encode_status: status, encode_updated_at: new Date().toISOString() })
    .eq("lesson_id", lessonId);
  if (error) throw error;
}

export async function setLessonDescription(lessonId: string, description: string): Promise<void> {
  const { error } = await supabase
    .from("course_lessons")
    .update({ description: description.trim() || null })
    .eq("id", lessonId);
  if (error) throw error;
}

export interface NewLesson {
  code: string;
  title: string;
  kind: "video" | "quiz" | "problems" | "test";
  duration_minutes: number | null;
}

/** New lesson at the end of the module, unpublished. */
export async function addLesson(module: AdminLessonModule, input: NewLesson): Promise<void> {
  const order = Math.max(0, ...module.lessons.map((l) => l.order_number)) + 1;
  const { error } = await supabase.from("course_lessons").insert({
    module_id: module.id,
    code: input.code.trim(),
    title: input.title.trim(),
    kind: input.kind,
    duration_minutes: input.duration_minutes,
    order_number: order,
    is_published: false,
  });
  if (error) throw new Error(error.code === "23505" ? `${input.code} already exists in this module.` : error.message);
}

/** Deletes the lesson, its video id and everyone's progress on it. */
export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from("course_lessons").delete().eq("id", lessonId);
  if (error) throw error;
}

export async function setLessonPublished(lessonId: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from("course_lessons").update({ is_published: isPublished }).eq("id", lessonId);
  if (error) throw error;
}

export async function updateModuleRelease(
  moduleId: string,
  input: Partial<Pick<AdminLessonModule, "is_free" | "is_released" | "release_label">>
): Promise<void> {
  const { error } = await supabase.from("course_modules").update(input).eq("id", moduleId);
  if (error) throw error;
}

/** Test and worked-answer files must never be published (the database refuses them too). */
export const isAnswerFile = (name: string) => /_(test|solved)/i.test(name);

export async function addCourseFile(
  module: { id: string; code: string | null },
  title: string,
  file: File,
  order: number,
  kind: AdminCourseFile["kind"] = "resource"
) {
  if (isAnswerFile(file.name)) throw new Error("Test and answer files (*_Test*, *_Solved*) can't be uploaded.");
  const folder = module.code ?? module.id;
  const path = `${folder}/${file.name.replace(/[^\w.-]+/g, "_")}`;
  const { error: uploadError } = await supabase.storage.from("course-files").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { error } = await supabase
    .from("course_files")
    .upsert({ module_id: module.id, title, storage_path: path, order_number: order, kind }, { onConflict: "storage_path" });
  if (error) throw error;
}

export async function setCourseFileKind(fileId: string, kind: AdminCourseFile["kind"]): Promise<void> {
  const { error } = await supabase.from("course_files").update({ kind }).eq("id", fileId);
  if (error) throw error;
}

export async function deleteCourseFile(file: AdminCourseFile): Promise<void> {
  const { error } = await supabase.from("course_files").delete().eq("id", file.id);
  if (error) throw error;
  await supabase.storage.from("course-files").remove([file.storage_path]);
}

/** Whether the file is actually in storage yet (seeded rows exist before the upload). */
export async function courseFileExists(path: string): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const { data } = await supabase.storage
    .from("course-files")
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });
  return (data ?? []).some((o) => o.name === path.slice(slash + 1));
}
