// Meta Pixel. The base code is written into every prerendered public page's
// <head> by scripts/prerender.mjs (which also fires the first PageView). The
// client-only shell (dist/app.html — login, dashboard, admin…) has no pixel,
// so a visitor who lands there and then navigates to a public page gets it
// loaded here at runtime instead. Every call is a no-op when
// VITE_META_PIXEL_ID is unset, during SSR, or on a page excluded below.

const RAW_ID = (import.meta.env.VITE_META_PIXEL_ID ?? "").trim();
/** Only a numeric ID is accepted, so a placeholder value never loads anything. */
export const META_PIXEL_ID = /^\d+$/.test(RAW_ID) ? RAW_ID : "";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

// No pixel on sign-in, admin or the logged-in LMS (dashboard and the
// classroom/video player).
const EXCLUDED = [/^\/login\/?$/, /^\/forgot-password\/?$/, /^\/reset-password\/?$/, /^\/admin(\/|$)/, /^\/dashboard(\/|$)/, /^\/classroom(\/|$)/];

export function isPixelPath(pathname: string): boolean {
  return !EXCLUDED.some((re) => re.test(pathname));
}

function enabled(): boolean {
  return Boolean(META_PIXEL_ID) && typeof window !== "undefined" && isPixelPath(window.location.pathname);
}

/** Whether the base code is already on the page (from the prerendered <head> or an earlier load). */
export function pixelLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

// Meta's standard base code, minus the initial PageView (MetaPixelTracker
// sends page views on route changes).
function loadPixel() {
  if (pixelLoaded()) return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  // Page views are sent by MetaPixelTracker; stop the pixel also sending one
  // itself on every history.pushState.
  n.disablePushState = true;
  window.fbq = n;
  window._fbq ??= n;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  n("init", META_PIXEL_ID);
}

/** fbq('track', …). `eventID` lets Meta de-duplicate (e.g. the Razorpay payment id). */
export function trackPixel(event: string, params?: Record<string, unknown>, eventID?: string) {
  if (!enabled()) return;
  loadPixel();
  window.fbq!("track", event, params ?? {}, eventID ? { eventID } : undefined);
}
