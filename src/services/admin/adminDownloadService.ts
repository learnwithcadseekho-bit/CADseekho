import { supabase } from "@/lib/supabaseClient";
import type { Download } from "@/types/download";

export async function listAllDownloads(): Promise<Download[]> {
  const { data, error } = await supabase.from("downloads").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Download[];
}

export type DownloadInput = Pick<
  Download,
  | "title"
  | "slug"
  | "description"
  | "category"
  | "file_path"
  | "file_type"
  | "file_size"
  | "thumbnail"
  | "requires_login"
  | "is_published"
>;

export async function createDownload(input: DownloadInput): Promise<Download> {
  const { data, error } = await supabase.from("downloads").insert(input).select("*").single();
  if (error) throw error;
  return data as Download;
}

export async function updateDownload(id: string, input: Partial<DownloadInput>): Promise<Download> {
  const { data, error } = await supabase.from("downloads").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Download;
}

export async function deleteDownload(id: string): Promise<void> {
  const { error } = await supabase.from("downloads").delete().eq("id", id);
  if (error) throw error;
}

// Bucket choice follows requires_login at upload time — if that flag changes
// afterward, the file should be re-uploaded so it lands in the right bucket.
export async function uploadDownloadFile(
  file: File,
  requiresLogin: boolean
): Promise<{ file_path: string; file_size: number; file_type: string }> {
  const bucket = requiresLogin ? "downloads-protected" : "downloads-public";
  const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
  return { file_path: path, file_size: file.size, file_type: ext };
}
