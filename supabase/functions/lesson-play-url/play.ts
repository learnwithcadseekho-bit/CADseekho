// Lesson playback: who may watch, and the signed Bunny Stream embed URL.
// Free of Deno APIs so the same code runs in the Edge Function (index.ts) and
// in the Node tests (tests/recorded-course.test.ts). Side effects come in via PlayDeps.
//
// Bunny "embed view token authentication" (bunny.net/docs/stream-embed-token-authentication):
//   token = SHA256_HEX(token_security_key + video_id + expires)   (expires: UNIX seconds)
//   https://player.mediadelivery.net/embed/{library_id}/{video_id}?token={token}&expires={expires}
// Turn on Token Authentication for the library in Bunny (Stream → library →
// Security), or Bunny will also accept the URL without the token.

export interface LessonRow {
  id: string;
  code: string;
  title: string;
  kind: string;
  is_published: boolean;
  module_id: string;
}

export interface VideoRow {
  bunny_video_id: string;
  encode_status: "none" | "processing" | "ready" | "failed";
  library_id: string | null;
}

export interface PlayDeps {
  getLesson: (lessonId: string) => Promise<LessonRow | null>;
  /** public.lesson_access(lesson, user) in Postgres — the one access rule (expiry, free modules, admin…). */
  hasAccess: (lessonId: string, userId: string) => Promise<boolean>;
  isAdmin: (userId: string) => Promise<boolean>;
  getVideo: (lessonId: string) => Promise<VideoRow | null>;
  /** Saved position in seconds; 0 when finished or never started. */
  getResumeAt: (lessonId: string, userId: string) => Promise<number>;
  env: { libraryId?: string; tokenKey?: string };
  now: () => number;
  /** How long a signed URL stays valid, in seconds. */
  ttlSeconds?: number;
}

export interface PlayOk {
  url: string;
  expires: number;
  lessonCode: string;
  resumeAt: number;
}

export type PlayRefusalCode = "invalid" | "signed_out" | "not_found" | "coming_soon" | "locked" | "no_video" | "processing" | "not_configured";

export interface PlayResponse {
  status: number;
  body: PlayOk | { error: string; code: PlayRefusalCode };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DEFAULT_TTL_SECONDS = 3 * 60 * 60;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signBunnyEmbedUrl(libraryId: string, tokenKey: string, videoId: string, expires: number): Promise<string> {
  const token = await sha256Hex(`${tokenKey}${videoId}${expires}`);
  const params = new URLSearchParams({ token, expires: String(expires), autoplay: "false", preload: "true", responsive: "true" });
  return `https://player.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?${params}`;
}

const refuse = (status: number, code: PlayRefusalCode, error: string): PlayResponse => ({ status, body: { error, code } });

export async function handlePlay(body: unknown, userId: string | null, deps: PlayDeps): Promise<PlayResponse> {
  const lessonId = body && typeof body === "object" ? (body as { lessonId?: unknown }).lessonId : undefined;
  if (typeof lessonId !== "string" || !UUID_RE.test(lessonId)) return refuse(400, "invalid", "Invalid request.");

  if (!userId) return refuse(401, "signed_out", "Sign up free to watch this lesson.");

  const lesson = await deps.getLesson(lessonId);
  if (!lesson) return refuse(404, "not_found", "Lesson not found.");

  if (!lesson.is_published && !(await deps.isAdmin(userId))) return refuse(404, "coming_soon", "This lesson isn't released yet.");

  if (!(await deps.hasAccess(lesson.id, userId))) return refuse(403, "locked", "This lesson is part of the paid course.");

  const video = await deps.getVideo(lesson.id);
  if (!video) return refuse(404, "no_video", "The video for this lesson is coming soon.");
  if (video.encode_status !== "ready") return refuse(409, "processing", "This video is still processing. Please check back shortly.");

  const libraryId = video.library_id ?? deps.env.libraryId;
  const { tokenKey } = deps.env;
  if (!libraryId || !tokenKey) return refuse(500, "not_configured", "Video playback is temporarily unavailable.");

  const expires = Math.floor(deps.now() / 1000) + (deps.ttlSeconds ?? DEFAULT_TTL_SECONDS);
  return {
    status: 200,
    body: {
      url: await signBunnyEmbedUrl(libraryId, tokenKey, video.bunny_video_id, expires),
      expires,
      lessonCode: lesson.code,
      resumeAt: await deps.getResumeAt(lesson.id, userId),
    },
  };
}
