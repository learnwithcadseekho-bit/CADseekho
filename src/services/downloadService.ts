import { supabase } from "@/lib/supabaseClient";
import type { Download, DownloadLog } from "@/types/download";

const PUBLIC_BUCKET = "downloads-public";
const PROTECTED_BUCKET = "downloads-protected";
const SIGNED_URL_TTL_SECONDS = 60;

export async function getPublishedDownloads(): Promise<Download[]> {
  const { data, error } = await supabase
    .from("downloads")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Download[];
}

export function getPublicDownloadUrl(filePath: string): string {
  const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

// Requires the caller to already be authenticated — enforced by the
// downloads-protected bucket's storage RLS policy, not just this function.
export async function getSignedDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PROTECTED_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}

export async function logDownload(downloadId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("download_logs")
    .insert({ download_id: downloadId, user_id: userId });
  if (error) throw error;
}

export interface DownloadLogWithResource extends DownloadLog {
  download: Download;
}

export async function getMyDownloadHistory(userId: string): Promise<DownloadLogWithResource[]> {
  const { data, error } = await supabase
    .from("download_logs")
    .select("*, download:downloads(*)")
    .eq("user_id", userId)
    .order("downloaded_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as DownloadLogWithResource[];
}
