import DOMPurify from "dompurify";

type Purifier = Pick<typeof DOMPurify, "sanitize">;

// DOMPurify needs a DOM. In the browser that's the page's own; during the
// build-time prerender (Node) entry-server.tsx provides a jsdom-backed one.
function purifier(): Purifier {
  if (import.meta.env.SSR) {
    const ssr = (globalThis as { __CADSEEKHO_PURIFIER__?: Purifier }).__CADSEEKHO_PURIFIER__;
    if (!ssr) throw new Error("sanitizeHtml: no server-side DOMPurify (set up in entry-server.tsx)");
    return ssr;
  }
  return DOMPurify;
}

// Admin-authored rich text (course descriptions, syllabus, blog content) is
// rendered as real HTML on public pages. The editor's schema already
// prevents things like <script> tags structurally, but this is the
// defense-in-depth layer in case content ever enters the DB some other way
// (direct SQL, API misuse).
export function sanitizeHtml(html: string): string {
  return purifier().sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "span", "h2", "h3", "img"],
    ALLOWED_ATTR: ["style", "src", "alt"],
  }) as string;
}
