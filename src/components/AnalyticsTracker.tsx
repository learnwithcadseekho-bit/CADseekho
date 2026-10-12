import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { baseTagsPresent, trackContact, trackPageView } from "@/lib/track";
import { captureAttribution } from "@/lib/attribution";

// The location key of the last page view sent — guards against StrictMode's
// double effect run in development sending the same page view twice.
let lastKey: string | null = null;

// Page views for a single-page app (Meta Pixel + GA4): one per client-side
// navigation. On the first page of a visit the prerendered <head> base code
// has already sent the page view, so that one is skipped for whichever tags
// were already there; on a page served from the client-only shell there is
// no base code yet and src/lib/track.ts loads it.
// Also sends Contact for any WhatsApp or phone link click, site-wide, and
// keeps the visit's UTM/click ids for the demo form.
export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    if (location.key === lastKey) return;
    const firstLoad = lastKey === null;
    lastKey = location.key;
    if (firstLoad) captureAttribution();
    const present = firstLoad ? baseTagsPresent() : null;
    // After Helmet has swapped in the new page's <title>.
    window.setTimeout(() => trackPageView(present), 0);
  }, [location.key]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href") ?? "";
      if (/^tel:/i.test(href)) trackContact("phone");
      else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com)\//i.test(href)) trackContact("whatsapp");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
