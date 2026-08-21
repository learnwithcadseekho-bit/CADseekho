import DOMPurify from "dompurify";

// Admin-authored rich text (course descriptions, syllabus, blog content) is
// rendered as real HTML on public pages. The editor's schema already
// prevents things like <script> tags structurally, but this is the
// defense-in-depth layer in case content ever enters the DB some other way
// (direct SQL, API misuse).
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "span", "h2", "h3", "img"],
    ALLOWED_ATTR: ["style", "src", "alt"],
  });
}
