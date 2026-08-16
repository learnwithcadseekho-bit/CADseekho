import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface FileUploadFieldProps {
  label: string;
  bucket: string;
  value: string | null;
  onChange: (value: string) => void;
  /** "url" stores the public URL (public buckets); "path" stores the raw storage path (private buckets). */
  returnMode?: "url" | "path";
  accept?: string;
}

export function FileUploadField({
  label,
  bucket,
  value,
  onChange,
  returnMode = "url",
  accept,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(false);
    try {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      if (returnMode === "url") {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        onChange(data.publicUrl);
      } else {
        onChange(path);
      }
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <input type="file" accept={accept} onChange={handleFileChange} disabled={uploading} />
      {uploading && <p className="admin-hint">Uploading…</p>}
      {error && <p className="field__error">Upload failed. Please try again.</p>}
      {value && !uploading && <p className="admin-hint">Current: {value}</p>}
    </div>
  );
}
