import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pixelLoaded, trackPixel } from "@/lib/metaPixel";

// The location key of the last page view sent — guards against StrictMode's
// double effect run in development sending the same page view twice.
let lastKey: string | null = null;

// Meta Pixel page views for a single-page app: one per client-side
// navigation. On the first page of a visit the <head> base code has already
// sent PageView (prerendered pages), so that one is skipped; on a page served
// from the client-only shell there is no base code yet and trackPixel loads it.
// Also sends Contact for any WhatsApp or phone link click, site-wide.
export function MetaPixelTracker() {
  const location = useLocation();

  useEffect(() => {
    if (location.key === lastKey) return;
    const firstLoad = lastKey === null;
    lastKey = location.key;
    if (firstLoad && pixelLoaded()) return;
    trackPixel("PageView");
  }, [location.key]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href") ?? "";
      if (/^tel:/i.test(href)) trackPixel("Contact", { content_name: "Phone" });
      else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com)\//i.test(href))
        trackPixel("Contact", { content_name: "WhatsApp" });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
