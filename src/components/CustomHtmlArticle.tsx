import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface CustomHtmlArticleProps {
  htmlUrl: string;
  downloadName: string;
}

// Renders an admin-uploaded, self-contained HTML/CSS file verbatim, so its
// own design never collides with (or gets stripped by) the site's sanitized
// rich-content pipeline. Supabase Storage always serves text/html uploads as
// text/plain (with nosniff) to prevent stored-XSS on its shared domain, so
// pointing an iframe's `src` straight at the storage URL renders as plain
// text instead of markup. Fetching the bytes via JS and assigning them to
// `srcDoc` sidesteps that — srcDoc content is parsed as HTML unconditionally,
// regardless of how it was fetched. The uploaded file carries a small
// injected script (see admin/components/HtmlBlogUploadField) that posts its
// height back via postMessage, since srcDoc iframes have an opaque origin
// and same-origin scrollHeight reads aren't available.
export function CustomHtmlArticle({ htmlUrl, downloadName }: CustomHtmlArticleProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [height, setHeight] = useState(1200);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    fetch(htmlUrl)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setHtml(text);
      });
    return () => {
      cancelled = true;
    };
  }, [htmlUrl]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.source === iframeRef.current?.contentWindow && e.data?.source === "cadseekho-blog-iframe") {
        setHeight(e.data.height);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleDownload() {
    if (loading) return;
    if (!session) {
      navigate("/login", { state: { from: location } });
      return;
    }
    // Storage URLs are cross-origin, and the `download` attribute is ignored
    // for cross-origin hrefs — fetch as a blob first so the browser saves it
    // instead of navigating to it.
    const res = await fetch(htmlUrl);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <>
      <div className="container" style={{ display: "flex", justifyContent: "flex-end", padding: "var(--space-4) 0" }}>
        <button type="button" className="btn btn--outline btn--sm" onClick={handleDownload}>
          {session ? "Download Article" : "Sign in to Download"}
        </button>
      </div>

      {html !== null && (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title={downloadName}
          style={{ display: "block", width: "100%", height, border: "none" }}
        />
      )}
    </>
  );
}
