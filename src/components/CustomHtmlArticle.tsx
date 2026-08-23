import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface CustomHtmlArticleProps {
  htmlUrl: string;
  downloadName: string;
}

// Renders an admin-uploaded, self-contained HTML/CSS file verbatim inside an
// iframe, so its own design never collides with (or gets stripped by) the
// site's sanitized rich-content pipeline. The uploaded file carries a small
// injected script (see admin/components/HtmlBlogUploadField) that posts its
// height back via postMessage, since the file is served cross-origin from
// Supabase Storage and same-origin scrollHeight reads aren't available.
export function CustomHtmlArticle({ htmlUrl, downloadName }: CustomHtmlArticleProps) {
  const [height, setHeight] = useState(1200);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

      <iframe
        ref={iframeRef}
        src={htmlUrl}
        title={downloadName}
        style={{ display: "block", width: "100%", height, border: "none" }}
      />
    </>
  );
}
