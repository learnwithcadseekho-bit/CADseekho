// Returns a short-lived signed Bunny Stream embed URL for one lesson, after
// checking the caller may watch it (public.module_access: free module →
// any signed-in user; paid module → enrolled; admin → everything). The Bunny
// token key never leaves the server; video ids are only read here, with the
// service role (course_lesson_videos is admin-only under RLS). Logic: ./play.ts.
//
// Deploy: supabase functions deploy lesson-play-url
//   (verify_jwt stays on: the site calls it with the user's session or the anon key.)
// Secrets (Bunny → Stream → your library):
//   supabase secrets set BUNNY_STREAM_LIBRARY_ID=<library id, e.g. 123456>
//   supabase secrets set BUNNY_STREAM_TOKEN_KEY=<API → "Token authentication key">

import { corsHeaders, getCallerId, json, rest } from "../_shared/razorpay.ts";
import { handlePlay, type LessonRow } from "./play.ts";

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
      const res = await rest(`course_lessons?id=eq.${encodeURIComponent(id)}&select=id,code,title,is_published,module_id`);
      if (!res.ok) throw new Error(`course_lessons ${res.status}: ${await res.text()}`);
      const [row] = (await res.json()) as LessonRow[];
      return row ?? null;
    },
    hasAccess: async (moduleId, uid) => {
      const res = await rest("rpc/module_access", {
        method: "POST",
        body: JSON.stringify({ p_module_id: moduleId, p_user_id: uid }),
      });
      if (!res.ok) throw new Error(`module_access ${res.status}: ${await res.text()}`);
      return (await res.json()) === true;
    },
    isAdmin: async (uid) => {
      const res = await rest(`profiles?id=eq.${uid}&select=role`);
      const [row] = (await res.json()) as { role: string }[];
      return row?.role === "admin";
    },
    getVideoId: async (lessonId) => {
      const res = await rest(`course_lesson_videos?lesson_id=eq.${lessonId}&select=bunny_video_id`);
      const [row] = (await res.json()) as { bunny_video_id: string }[];
      return row?.bunny_video_id ?? null;
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
