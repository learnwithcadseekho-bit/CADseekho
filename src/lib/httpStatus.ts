// Lets a page tell the build-time prerender which HTTP status it represents
// (e.g. 404 for "not found"), so the prerender never writes a "not found"
// page as if it were a real, indexable URL. No-op in the browser.
let status = 200;

export function setSsrStatus(code: number) {
  if (import.meta.env.SSR) status = code;
}

export function takeSsrStatus(): number {
  const current = status;
  status = 200;
  return current;
}
