import { useLayoutEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCachedData } from "@/hooks/useCachedData";
import { fetchCustomHtml, isImageUrl, toShadowMarkup } from "@/utils/customArticle";

interface CustomHtmlArticleProps {
  htmlUrl: string;
  downloadName: string;
  /** Used as alt text when the upload is an image rather than an HTML file. */
  title: string;
}

// useLayoutEffect warns during server rendering; it never runs there anyway.
const useIsomorphicLayoutEffect = import.meta.env.SSR ? () => {} : useLayoutEffect;

// Renders an admin-uploaded, self-contained HTML/CSS file verbatim inside a
// shadow root, so its own design never collides with (or gets stripped by)
// the site's sanitized rich-content pipeline. Supabase Storage serves these
// uploads as text/plain, so the file is fetched and its markup injected.
//
// The build-time prerender writes the article as a declarative shadow root
// (<template shadowrootmode="open">), so the article text ships in the page's
// HTML and is indexable. In the browser the parser has already attached that
// shadow root by the time React hydrates; on client-side navigation the
// layout effect attaches it instead.
export function CustomHtmlArticle({ htmlUrl, downloadName, title }: CustomHtmlArticleProps) {
  const image = isImageUrl(htmlUrl);
  const { data: html, error } = useCachedData(image ? null : `html:${htmlUrl}`, () => fetchCustomHtml(htmlUrl));
  const markup = useMemo(() => (html ? toShadowMarkup(html) : null), [html]);
  const hostRef = useRef<HTMLDivElement>(null);
  const hydratedFromServer = useRef(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useIsomorphicLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !markup) return;
    if (host.shadowRoot && host.shadowRoot.childNodes.length > 0 && !hydratedFromServer.current) {
      // Server-rendered shadow root is already showing this article.
      hydratedFromServer.current = true;
      return;
    }
    hydratedFromServer.current = true;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = markup;
  }, [markup]);

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

  if (image) {
    return (
      <div className="container" style={{ padding: "var(--space-8) 0", textAlign: "center" }}>
        <h1 style={{ marginBottom: "var(--space-6)" }}>{title}</h1>
        <img src={htmlUrl} alt={title} style={{ maxWidth: "100%", height: "auto" }} decoding="async" />
      </div>
    );
  }

  return (
    <>
      <div className="container" style={{ display: "flex", justifyContent: "flex-end", padding: "var(--space-4) 0" }}>
        <button type="button" className="btn btn--outline btn--sm" onClick={handleDownload}>
          {session ? "Download Article" : "Sign in to Download"}
        </button>
      </div>

      {error ? (
        <p className="section__status">This article couldn&apos;t be loaded. Please try again later.</p>
      ) : (
        // Always rendered (even before the HTML arrives) so the element React
        // hydrates matches the server's. Light DOM stays empty: the article
        // lives in the shadow root.
        <div
          ref={hostRef}
          className="custom-article"
          dangerouslySetInnerHTML={{
            __html: import.meta.env.SSR && markup ? `<template shadowrootmode="open">${markup}</template>` : "",
          }}
          suppressHydrationWarning
        />
      )}
    </>
  );
}
