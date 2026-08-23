import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const RESIZE_SCRIPT = `
<script>
(function () {
  function post() {
    parent.postMessage({ source: "cadseekho-blog-iframe", height: document.documentElement.scrollHeight }, "*");
  }
  window.addEventListener("load", post);
  if (window.ResizeObserver) {
    new ResizeObserver(post).observe(document.documentElement);
  } else {
    window.addEventListener("resize", post);
    setInterval(post, 500);
  }
})();
</script>
`;

// Injects a small script that reports the document's height to the parent
// frame via postMessage — the file renders in a cross-origin iframe (Supabase
// Storage), so the parent page can't read its scrollHeight directly. Doesn't
// touch anything visible: no markup, styles, or content are altered.
function withResizeScript(html: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${RESIZE_SCRIPT}</body>`);
  }
  return html + RESIZE_SCRIPT;
}

interface HtmlBlogUploadFieldProps {
  value: string | null;
  onChange: (url: string) => void;
}

export function HtmlBlogUploadField({ value, onChange }: HtmlBlogUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(false);
    try {
      const html = withResizeScript(await file.text());
      const blob = new Blob([html], { type: "text/html" });
      const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from("blog-html").upload(path, blob, {
        upsert: false,
        contentType: "text/html",
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("blog-html").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="field">
      <label className="field__label">Custom HTML File (optional)</label>
      <p className="admin-hint" style={{ marginBottom: "var(--space-2)" }}>
        Upload a self-contained .html file to render it verbatim, with its own design, instead of the
        Content field above.
      </p>
      <input type="file" accept=".html,text/html" onChange={handleFileChange} disabled={uploading} />
      {uploading && <p className="admin-hint">Uploading…</p>}
      {error && <p className="field__error">Upload failed. Please try again.</p>}
      {value && !uploading && <p className="admin-hint">Current: {value}</p>}
    </div>
  );
}
