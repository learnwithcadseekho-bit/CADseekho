// Lesson playback: who may watch, and the signed Bunny Stream embed URL.
// Free of Deno APIs so the same code runs in the Edge Function (index.ts) and
// in the Node tests (tests/sw-simulation.test.ts). Side effects come in via PlayDeps.
//
// Bunny "embed view token authentication":
//   token = SHA256_HEX(token_security_key + video_id + expires)
//   https://iframe.mediadelivery.net/embed/{library_id}/{video_id}?token={token}&expires={expires}
// Turn on Token Authentication for the library in Bunny (Stream → library →
// Security), or Bunny will also accept the URL without the token.

export interface LessonRow {
  id: string;
  code: string;
  title: string;
  is_published: boolean;
  module_id: string;
}

export interface PlayDeps {
  getLesson: (lessonId: string) => Promise<LessonRow | null>;
  /** public.module_access(module, user) in Postgres — the one access rule. */
  hasAccess: (moduleId: string, userId: string) => Promise<boolean>;
  isAdmin: (userId: string) => Promise<boolean>;
  getVideoId: (lessonId: string) => Promise<string | null>;
  env: { libraryId?: string; tokenKey?: string };
  now: () => number;
  /** How long a signed URL stays valid, in seconds. */
  ttlSeconds?: number;
}

export interface PlayResponse {
  status: number;
  body: { url: string; expires: number; lessonCode: string } | { error: string; code: string };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signBunnyEmbedUrl(libraryId: string, tokenKey: string, videoId: string, expires: number): Promise<string> {
  const token = await sha256Hex(`${tokenKey}${videoId}${expires}`);
  const params = new URLSearchParams({ token, expires: String(expires), autoplay: "false", preload: "true", responsive: "true" });
  return `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?${params}`;
}

export async function handlePlay(body: unknown, userId: string | null, deps: PlayDeps): Promise<PlayResponse> {
  const lessonId = body && typeof body === "object" ? (body as { lessonId?: unknown }).lessonId : undefined;
  if (typeof lessonId !== "string" || !UUID_RE.test(lessonId))
    return { status: 400, body: { error: "Invalid request.", code: "invalid" } };

  if (!userId) return { status: 401, body: { error: "Sign up free to watch this lesson.", code: "signed_out" } };

  const lesson = await deps.getLesson(lessonId);
  if (!lesson) return { status: 404, body: { error: "Lesson not found.", code: "not_found" } };

  const admin = await deps.isAdmin(userId);
  if (!admin && !lesson.is_published)
    return { status: 404, body: { error: "This lesson isn't released yet.", code: "coming_soon" } };

  if (!(await deps.hasAccess(lesson.module_id, userId)))
    return { status: 403, body: { error: "This lesson is part of the paid course.", code: "locked" } };

  const videoId = await deps.getVideoId(lesson.id);
  if (!videoId) return { status: 404, body: { error: "The video for this lesson is coming soon.", code: "no_video" } };

  const { libraryId, tokenKey } = deps.env;
  if (!libraryId || !tokenKey) return { status: 500, body: { error: "Video playback is temporarily unavailable.", code: "not_configured" } };

  const expires = Math.floor(deps.now() / 1000) + (deps.ttlSeconds ?? 3 * 60 * 60);
  return {
    status: 200,
    body: { url: await signBunnyEmbedUrl(libraryId, tokenKey, videoId, expires), expires, lessonCode: lesson.code },
  };
}
