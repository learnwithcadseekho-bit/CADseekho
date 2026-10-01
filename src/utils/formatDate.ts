// Fixed to India time: dates are formatted at build time (prerender) and again
// in the browser, and both must produce the same text for hydration — and the
// audience is in India anyway.
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
