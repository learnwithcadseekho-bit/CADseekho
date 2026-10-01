// Turns an admin-uploaded, self-contained HTML article into markup for a
// shadow root, so its own design renders verbatim without colliding with
// (or being restyled by) the site's CSS — what the old iframe did — while the
// text is part of the page itself, where search engines index it.
//
// - Keeps <style> blocks and stylesheet <link>s, and the <body> content.
// - Rewrites document-level selectors (:root, html, body) to :host, since a
//   shadow tree has no <html>/<body> of its own.
// - Drops <script>s (the old iframe height-reporting script among them).
// Limitation: @font-face rules don't apply inside shadow trees, so articles
// should use system fonts or fonts the site already loads.

const STYLE_RE = /<style[^>]*>[\s\S]*?<\/style>|<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi;

function scopeCss(css: string): string {
  return css
    .replace(/:root\b/g, ":host")
    .replace(/(^|[\s,{}>+~(])(html|body)(?=[\s,{.:#[>+~)]|$)/gm, "$1:host");
}

export function toShadowMarkup(html: string): string {
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch
    ? bodyMatch[1]
    : html.replace(/<!doctype[^>]*>|<\/?html[^>]*>|<head[^>]*>[\s\S]*?<\/head>/gi, "");

  const headStyles = head.match(STYLE_RE) ?? [];
  const content = body.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(STYLE_RE, (tag) => scopeCss(tag));

  return `<style>:host{display:block}</style>${headStyles.map(scopeCss).join("")}${content}`;
}

/** The article's own <meta name="description">, used when the post has no usable excerpt. */
export function articleMetaDescription(html: string): string | null {
  const match =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return match ? decodeEntities(match[1]).trim() || null : null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** True when the "custom HTML" upload is actually an image (rendered as <img>). */
export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(url);
}

export async function fetchCustomHtml(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load article HTML (${res.status})`);
  return res.text();
}
