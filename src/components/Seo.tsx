import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { absoluteUrl, BUSINESS } from "@/config/site";

type JsonLd = Record<string, unknown>;

export interface Breadcrumb {
  name: string;
  path: string;
}

interface SeoProps {
  /** Page title. " | CADseekho" is appended when it fits in 60 chars and the title doesn't already name the brand. */
  title: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  /** Canonical path or absolute URL; defaults to the current path. */
  canonical?: string;
  /** Private/thin pages: emits robots noindex and is left out of the sitemap. */
  noindex?: boolean;
  /** Trail after "Home" — emitted as BreadcrumbList JSON-LD. */
  breadcrumbs?: Breadcrumb[];
  /** Page-specific structured data (Course, BlogPosting, FAQPage, …). */
  jsonLd?: JsonLd | JsonLd[];
}

const MAX_DESCRIPTION = 155;
const MAX_TITLE = 60;

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/** JSON for a <script> tag — `<` is escaped so content can't close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Section 26: per-page title, meta description, canonical URL, Open Graph /
// Twitter metadata and JSON-LD. Rendered through react-helmet-async, so the
// build-time prerender writes these tags into each page's static HTML, and
// they're swapped correctly on client-side navigation too.
export function Seo({
  title,
  description,
  image,
  type = "website",
  canonical,
  noindex = false,
  breadcrumbs,
  jsonLd,
}: SeoProps) {
  const location = useLocation();
  const branded = `${title} | ${BUSINESS.name}`;
  const fullTitle = /cadseekho/i.test(title) || branded.length > MAX_TITLE ? title : branded;
  const desc = description ? truncate(description, MAX_DESCRIPTION) : undefined;
  const url = absoluteUrl(canonical ?? location.pathname);
  const imageUrl = image ? absoluteUrl(image) : undefined;

  const schemas: JsonLd[] = [];
  if (breadcrumbs) {
    const trail = [{ name: "Home", path: "/" }, ...breadcrumbs];
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path),
      })),
    });
  }
  if (jsonLd) schemas.push(...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]));

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:site_name" content={BUSINESS.name} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {jsonLdString(schema)}
        </script>
      ))}
    </Helmet>
  );
}
