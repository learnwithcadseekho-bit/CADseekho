// Old URL → new URL (301). The source of truth: vercel.json, public/.htaccess
// (Hostinger/Apache) and public/_redirects (Netlify) must each contain every
// entry — the prerender fails the build if one is missing. NotFoundPage also
// uses this as a client-side fallback.
export const LEGACY_REDIRECTS: { from: string; to: string }[] = [
  { from: "/blog/Deep Holes", to: "/blog/deep-hole-drilling-design-guide" },
  { from: "/blog/Stress Concentration", to: "/blog/stress-concentration-factor" },
  { from: "/courses/Solidworks Simulation for Begginner", to: "/courses/solidworks-simulation-for-beginners" },
  { from: "/downloads", to: "/resources" },
];

/** New path for a legacy path (decoded or percent-encoded), if any. */
export function legacyRedirect(pathname: string): string | null {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // keep as-is
  }
  const clean = decoded.replace(/\/+$/, "").toLowerCase();
  return LEGACY_REDIRECTS.find((r) => r.from.toLowerCase() === clean)?.to ?? null;
}
