// Returns a short-lived signed Bunny Stream embed URL for one lesson, after
// checking the caller may watch it (public.lesson_access: free module →
// any signed-in user; paid module → active, unexpired enrollment; admin →
// everything) and that Bunny has finished encoding it. Also returns the saved
// position so the player can resume. The Bunny
// token key never leaves the server; video ids are only read here, with the
// service role (course_lesson_videos is admin-only under RLS). Logic: ./play.ts.
//
// Deploy: supabase functions deploy lesson-play-url
//   (verify_jwt stays on: the site calls it with the user's session or the anon key.)
// Secrets (Bunny → Stream → your library):
//   supabase secrets set BUNNY_STREAM_LIBRARY_ID=<library id, e.g. 123456>
//   supabase secrets set BUNNY_STREAM_TOKEN_KEY=<library → Security → "Token authentication key">

import { corsHeaders, getCallerId, json, rest } from "../_shared/razorpay.ts";
import { handlePlay, type LessonRow, type VideoRow } from "./play.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const userId = await getCallerId(req);
  const { status, body: out } = await handlePlay(body, userId, {
    getLesson: async (id) => {
      const res = await rest(`course_lessons?id=eq.${encodeURIComponent(id)}&select=id,code,title,kind,is_published,module_id`);
      if (!res.ok) throw new Error(`course_lessons ${res.status}: ${await res.text()}`);
      const [row] = (await res.json()) as LessonRow[];
      return row ?? null;
    },
    hasAccess: async (lessonId, uid) => {
      const res = await rest("rpc/lesson_access", {
        method: "POST",
        body: JSON.stringify({ p_lesson_id: lessonId, p_user_id: uid }),
      });
      if (!res.ok) throw new Error(`lesson_access ${res.status}: ${await res.text()}`);
      return (await res.json()) === true;
    },
    isAdmin: async (uid) => {
      const res = await rest(`profiles?id=eq.${uid}&select=role`);
      const [row] = (await res.json()) as { role: string }[];
      return row?.role === "admin";
    },
    getVideo: async (lessonId) => {
      const res = await rest(`course_lesson_videos?lesson_id=eq.${lessonId}&select=bunny_video_id,encode_status,library_id`);
      if (!res.ok) throw new Error(`course_lesson_videos ${res.status}: ${await res.text()}`);
      const [row] = (await res.json()) as VideoRow[];
      return row ?? null;
    },
    getResumeAt: async (lessonId, uid) => {
      const res = await rest(`lesson_progress?lesson_id=eq.${lessonId}&user_id=eq.${uid}&select=position_sec,completed`);
      if (!res.ok) return 0;
      const [row] = (await res.json()) as { position_sec: number; completed: boolean }[];
      return row && !row.completed ? row.position_sec : 0;
    },
    env: {
      libraryId: Deno.env.get("BUNNY_STREAM_LIBRARY_ID"),
      tokenKey: Deno.env.get("BUNNY_STREAM_TOKEN_KEY"),
    },
    now: Date.now,
  });
  if (status >= 500) console.error("lesson-play-url:", JSON.stringify(out));
  return json(out, status);
});
