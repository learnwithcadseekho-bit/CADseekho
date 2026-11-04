// Admin only: "Fetch from Bunny" — reads a lesson video's encoding status and
// length from the Bunny Stream API and stores them (course_lesson_videos.
// encode_status / duration_sec, and course_lessons.duration_minutes for the
// syllabus). The API key stays here; the browser only sends a lesson id.
//
// Deploy: supabase functions deploy bunny-video
// Secrets:
//   supabase secrets set BUNNY_STREAM_API_KEY=<Bunny → Stream → library → API → API key>
//   (BUNNY_STREAM_LIBRARY_ID is shared with lesson-play-url.)

import { corsHeaders, getCallerId, json, rest } from "../_shared/razorpay.ts";
import { BUNNY_GUID_RE, fetchBunnyVideo } from "../_shared/bunny.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const userId = await getCallerId(req);
  if (!userId) return json({ error: "Sign in as an admin." }, 401);
  const roleRes = await rest(`profiles?id=eq.${userId}&select=role`);
  const [profile] = (await roleRes.json()) as { role: string }[];
  if (profile?.role !== "admin") return json({ error: "Admins only." }, 403);

  let lessonId: unknown;
  try {
    lessonId = ((await req.json()) as { lessonId?: unknown }).lessonId;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (typeof lessonId !== "string" || !UUID_RE.test(lessonId)) return json({ error: "Invalid request." }, 400);

  const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");
  if (!apiKey) return json({ error: "BUNNY_STREAM_API_KEY isn't set on the server." }, 500);

  const videoRes = await rest(`course_lesson_videos?lesson_id=eq.${lessonId}&select=bunny_video_id,library_id`);
  const [video] = (await videoRes.json()) as { bunny_video_id: string; library_id: string | null }[];
  if (!video || !BUNNY_GUID_RE.test(video.bunny_video_id)) return json({ error: "Save a Bunny video ID for this lesson first." }, 404);
  const libraryId = video.library_id ?? Deno.env.get("BUNNY_STREAM_LIBRARY_ID");
  if (!libraryId) return json({ error: "BUNNY_STREAM_LIBRARY_ID isn't set on the server." }, 500);

  let info;
  try {
    info = await fetchBunnyVideo(libraryId, video.bunny_video_id, apiKey);
  } catch (err) {
    console.error("bunny-video:", err);
    return json({ error: "Bunny didn't answer. Check the API key and library id." }, 502);
  }
  if (!info) return json({ error: `No video ${video.bunny_video_id} in Bunny library ${libraryId}.` }, 404);

  const patch: Record<string, unknown> = { encode_status: info.encode_status, encode_updated_at: new Date().toISOString() };
  if (info.duration_sec) patch.duration_sec = info.duration_sec;
  const upd = await rest(`course_lesson_videos?lesson_id=eq.${lessonId}`, { method: "PATCH", body: JSON.stringify(patch) });
  if (!upd.ok) throw new Error(`course_lesson_videos ${upd.status}: ${await upd.text()}`);
  if (info.duration_sec) {
    await rest(`course_lessons?id=eq.${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify({ duration_minutes: Math.max(1, Math.round(info.duration_sec / 60)) }),
    });
  }
  return json(info);
});
