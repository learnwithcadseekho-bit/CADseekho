import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Section 26: per-page title, meta description, canonical URL, and Open
// Graph metadata. No SSR here, so this runs client-side via useEffect —
// sufficient for crawlers that execute JS (Google, Bing), which covers the
// realistic SEO surface for a static-hosted Vite SPA.
export function Seo({ title, description, image, type = "website" }: SeoProps) {
  useEffect(() => {
    const fullTitle = `${title} | CADseekho`;
    document.title = fullTitle;

    if (description) setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    if (description) setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:site_name", "CADseekho");
    setMeta("property", "og:url", window.location.href);
    if (image) setMeta("property", "og:image", image);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.origin + window.location.pathname);
  }, [title, description, image, type]);

  return null;
}
