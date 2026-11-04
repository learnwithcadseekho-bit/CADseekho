// Bunny Stream helpers shared by bunny-video (admin "Fetch from Bunny") and
// bunny-webhook. No Deno APIs, so tests/recorded-course.test.ts imports it too.
//
// Careful: the webhook and the Get Video API number statuses differently.
//   Webhook (bunny.net/docs/stream-webhook): 0 Queued, 1 Processing, 2 Encoding,
//     3 Finished, 4 Resolution finished, 5 Failed, 6 PresignedUploadStarted,
//     7 PresignedUploadFinished, 8 PresignedUploadFailed, 9–13 captions/AI
//     extras, 32 VideoDeleted, 33 SmartGenerationFailed.
//   Get Video `status` (bunny.net/docs/reference/video_getvideo): 0 Created,
//     1 Uploaded, 2 Processing, 3 Transcoding, 4 Finished, 5 Error,
//     6 UploadFailed, 7 JitSegmenting, 8 JitPlaylistsCreated.

export type EncodeStatus = "none" | "processing" | "ready" | "failed";

/** Get Video API `status` → our encode_status. */
export function encodeStatusFromApi(status: number): EncodeStatus {
  switch (status) {
    case 4: // Finished
    case 8: // JIT playlists created — playable
      return "ready";
    case 5: // Error
    case 6: // UploadFailed
      return "failed";
    default: // Created, Uploaded, Processing, Transcoding, JitSegmenting
      return "processing";
  }
}

/** Webhook `Status` → our encode_status, or null for events that don't change playability (captions, titles…). */
export function encodeStatusFromWebhook(status: number): EncodeStatus | null {
  switch (status) {
    case 0:
    case 1:
    case 2:
    case 6:
    case 7:
      return "processing";
    case 3: // Finished
    case 4: // A resolution finished — the video already plays
      return "ready";
    case 5:
    case 8:
      return "failed";
    case 32: // VideoDeleted
      return "none";
    default:
      return null;
  }
}

export const BUNNY_GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Bunny signs webhooks: X-BunnyStream-Signature = lowercase hex
 * HMAC-SHA256(raw body, the library's Read-Only API key), with
 * X-BunnyStream-Signature-Version: v1 and -Algorithm: hmac-sha256.
 */
export async function verifyBunnySignature(rawBody: string, headers: Headers, secret: string): Promise<boolean> {
  const sig = headers.get("x-bunnystream-signature")?.trim().toLowerCase();
  if (!sig) return false;
  const version = headers.get("x-bunnystream-signature-version");
  const algorithm = headers.get("x-bunnystream-signature-algorithm");
  if ((version && version !== "v1") || (algorithm && algorithm.toLowerCase() !== "hmac-sha256")) return false;
  return safeEqual(sig, await hmacHex(secret, rawBody));
}

export interface BunnyWebhookDeps {
  secret?: string;
  /**
   * Set encode_status for every lesson video with this GUID, unless a newer
   * status was already recorded (at = the event Timestamp). Returns rows changed.
   */
  updateStatus: (videoGuid: string, status: EncodeStatus, at: string) => Promise<number>;
  /** After "ready": look up duration (Get Video API) and store it. Optional. */
  refreshDuration?: (videoGuid: string, libraryId: string) => Promise<void>;
}

export interface WebhookResult {
  status: number;
  body: { ok: boolean; updated?: number; ignored?: string; error?: string };
}

/**
 * POST /functions/v1/bunny-webhook. Idempotent: repeating a delivery sets the
 * same status again, and an older delivery arriving late is ignored.
 * 4xx answers aren't retried by Bunny; 5xx are.
 */
export async function handleBunnyWebhook(rawBody: string, headers: Headers, deps: BunnyWebhookDeps): Promise<WebhookResult> {
  if (!deps.secret) return { status: 500, body: { ok: false, error: "not configured" } };
  if (!(await verifyBunnySignature(rawBody, headers, deps.secret))) return { status: 401, body: { ok: false, error: "bad signature" } };

  let event: { IsLiveStreamWebhook?: boolean; VideoLibraryId?: number; VideoGuid?: string; Status?: number; Timestamp?: string };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { ok: false, error: "invalid json" } };
  }
  if (event.IsLiveStreamWebhook) return { status: 200, body: { ok: true, ignored: "live stream" } };
  if (typeof event.VideoGuid !== "string" || !BUNNY_GUID_RE.test(event.VideoGuid) || typeof event.Status !== "number")
    return { status: 400, body: { ok: false, error: "invalid event" } };

  const status = encodeStatusFromWebhook(event.Status);
  if (!status) return { status: 200, body: { ok: true, ignored: `status ${event.Status}` } };

  const at = typeof event.Timestamp === "string" && !Number.isNaN(Date.parse(event.Timestamp)) ? event.Timestamp : new Date().toISOString();
  const guid = event.VideoGuid.toLowerCase();
  const updated = await deps.updateStatus(guid, status, at);
  if (updated > 0 && status === "ready" && deps.refreshDuration && event.VideoLibraryId != null) {
    try {
      await deps.refreshDuration(guid, String(event.VideoLibraryId));
    } catch {
      // Duration is nice to have; the status is what matters.
    }
  }
  return { status: 200, body: { ok: true, updated } };
}

export interface BunnyVideoInfo {
  encode_status: EncodeStatus;
  duration_sec: number | null;
  /** Bunny's own status number, for the admin's information. */
  bunny_status: number;
  title: string | null;
}

/** GET https://video.bunnycdn.com/library/{libraryId}/videos/{videoId} with the library API key. */
export async function fetchBunnyVideo(libraryId: string, videoId: string, apiKey: string, fetchFn: typeof fetch = fetch): Promise<BunnyVideoInfo | null> {
  const res = await fetchFn(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(videoId)}`, {
    headers: { AccessKey: apiKey, Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Bunny API ${res.status}`);
  const v = (await res.json()) as { status?: number; length?: number; title?: string };
  const bunnyStatus = typeof v.status === "number" ? v.status : -1;
  return {
    encode_status: encodeStatusFromApi(bunnyStatus),
    duration_sec: typeof v.length === "number" && v.length > 0 ? Math.round(v.length) : null,
    bunny_status: bunnyStatus,
    title: v.title ?? null,
  };
}
