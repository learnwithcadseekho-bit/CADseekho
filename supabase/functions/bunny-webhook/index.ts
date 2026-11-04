// Bunny Stream webhook: keeps course_lesson_videos.encode_status (and the
// duration, once encoded) in step with Bunny, so a lesson becomes playable
// as soon as Bunny finishes encoding it. Logic + tests: ../_shared/bunny.ts.
//
// Deploy: supabase functions deploy bunny-webhook --no-verify-jwt
//   (Bunny can't send a Supabase JWT; config.toml also sets verify_jwt = false)
// Secrets:
//   supabase secrets set BUNNY_WEBHOOK_SECRET=<library → API → Read-Only API key>   (Bunny signs webhooks with it)
//   supabase secrets set BUNNY_STREAM_API_KEY=<library → API → API key>              (optional: fills in durations)
// Bunny → Stream → your library → Webhook URL:
//   https://<project-ref>.supabase.co/functions/v1/bunny-webhook

import { rest } from "../_shared/razorpay.ts";
import { fetchBunnyVideo, handleBunnyWebhook } from "../_shared/bunny.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");
  const { status, body } = await handleBunnyWebhook(raw, req.headers, {
    secret: Deno.env.get("BUNNY_WEBHOOK_SECRET"),
    updateStatus: async (guid, encodeStatus, at) => {
      // Only if nothing newer was recorded — late, out-of-order deliveries are ignored.
      const filter = `bunny_video_id=eq.${guid}&or=(encode_updated_at.is.null,encode_updated_at.lt.${encodeURIComponent(at)})`;
      const res = await rest(`course_lesson_videos?${filter}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ encode_status: encodeStatus, encode_updated_at: at }),
      });
      if (!res.ok) throw new Error(`course_lesson_videos ${res.status}: ${await res.text()}`);
      return ((await res.json()) as unknown[]).length;
    },
    refreshDuration: apiKey
      ? async (guid, libraryId) => {
          const info = await fetchBunnyVideo(libraryId, guid, apiKey);
          if (!info?.duration_sec) return;
          await rest(`course_lesson_videos?bunny_video_id=eq.${guid}`, {
            method: "PATCH",
            body: JSON.stringify({ duration_sec: info.duration_sec }),
          });
        }
      : undefined,
  }).catch((err) => {
    console.error("bunny-webhook:", err);
    return { status: 500, body: { ok: false, error: "server error" } };
  });
  if (status !== 200) console.warn("bunny-webhook:", status, JSON.stringify(body));
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
});
