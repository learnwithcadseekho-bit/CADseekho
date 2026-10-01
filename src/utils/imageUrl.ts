// Supabase Storage originals are full-size PNGs (often 1+ MB). Its image
// transformation endpoint resizes on the fly and serves WebP/AVIF to
// browsers that accept them — typically ~95% smaller. Non-Supabase URLs
// (e.g. local /resources/... files) pass through unchanged.
const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

export function resizedImage(url: string, width: number, quality = 70): string {
  if (!url.includes(OBJECT_PATH) || /\.(svg|gif)(\?|$)/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url.replace(OBJECT_PATH, RENDER_PATH)}${sep}width=${width}&quality=${quality}`;
}

/** src/srcSet for an image shown at up to `maxWidth` CSS px (1x and 2x). */
export function responsiveImage(url: string, maxWidth: number): { src: string; srcSet?: string } {
  if (!url.includes(OBJECT_PATH)) return { src: url };
  return {
    src: resizedImage(url, maxWidth),
    srcSet: `${resizedImage(url, maxWidth)} ${maxWidth}w, ${resizedImage(url, maxWidth * 2)} ${maxWidth * 2}w`,
  };
}
