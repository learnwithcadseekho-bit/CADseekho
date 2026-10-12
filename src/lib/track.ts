// The one tracking module. Every component reports what the visitor did here
// (trackLead, trackPurchase…), and this file decides which tags hear about
// it: Meta Pixel, GA4 and Google Ads. Never call fbq/gtag from a component.
//
// Base tags: scripts/prerender.mjs writes the Meta Pixel and gtag.js (GA4 +
// Google Ads) into every prerendered public page's <head>; the client-only
// shell (login, dashboard, admin, classroom) has neither, and a visitor who
// starts there gets them loaded here when they reach a public page.

import { isPixelPath, pixelLoaded, setPixelUserData, trackPixel } from "@/lib/metaPixel";

// Shape-checked so a placeholder value never loads anything. Same checks as scripts/prerender.mjs.
const env = (v: string | undefined, re: RegExp) => ((v ?? "").trim().match(re) ? (v ?? "").trim() : "");
export const GA4_ID = env(import.meta.env.VITE_GA4_ID, /^G-[A-Z0-9]+$/);
export const ADS_ID = env(import.meta.env.VITE_GOOGLE_ADS_ID, /^AW-\d+$/);
// Conversion labels from Google Ads → Goals → Conversions → (action) → Tag setup.
const ADS_LEAD_LABEL = (import.meta.env.VITE_GOOGLE_ADS_LEAD_LABEL ?? "").trim();
const ADS_PURCHASE_LABEL = (import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL ?? "").trim();
const ADS_CONTACT_LABEL = (import.meta.env.VITE_GOOGLE_ADS_CONTACT_LABEL ?? "").trim();

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

/**
 * Consent gating goes here, and only here. Tags currently load for everyone;
 * if a consent banner is added, return false until the visitor accepts and
 * every event below stops at this check.
 */
function consentGranted(): boolean {
  return true;
}

function active(): boolean {
  return typeof window !== "undefined" && consentGranted() && isPixelPath(window.location.pathname);
}

export function gtagLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

function loadGtag() {
  if (gtagLoaded() || (!GA4_ID && !ADS_ID)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID || ADS_ID}`;
  document.head.appendChild(script);
  window.gtag("js", new Date());
  // Page views are sent by trackPageView, one per route change.
  if (GA4_ID) window.gtag("config", GA4_ID, { send_page_view: false });
  if (ADS_ID) window.gtag("config", ADS_ID);
}

function gtag(...args: unknown[]) {
  if (!GA4_ID && !ADS_ID) return;
  loadGtag();
  window.gtag!(...args);
}

function adsConversion(label: string, params: Record<string, unknown> = {}) {
  if (ADS_ID && label) gtag("event", "conversion", { send_to: `${ADS_ID}/${label}`, ...params });
}

/** Random id shared by the browser event and a future server-side (Conversions API) copy, for de-duplication. */
export function newEventId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}_${rand}`;
}

// ---------------------------------------------------------------------------

/**
 * One page view per client-side navigation. `firstLoad` is the page the
 * visitor landed on: its view was already sent by the base code in the
 * prerendered <head>, so only tags that weren't there send it here.
 */
export function trackPageView(firstLoad: { pixel: boolean; gtag: boolean } | null) {
  if (!active()) return;
  if (!firstLoad?.pixel) trackPixel("PageView");
  if (GA4_ID && !firstLoad?.gtag) {
    gtag("event", "page_view", {
      send_to: GA4_ID,
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
    });
  }
}

/** Whether the <head> base code had already loaded each tag (call before anything loads them). */
export function baseTagsPresent() {
  return { pixel: pixelLoaded(), gtag: gtagLoaded() };
}

export function trackViewContent(item: { name: string; id?: string; value?: number | null }) {
  if (!active()) return;
  trackPixel("ViewContent", {
    content_name: item.name,
    content_type: "product",
    ...(item.id && { content_ids: [item.id] }),
    ...(item.value != null && { value: item.value, currency: "INR" }),
  });
  if (GA4_ID)
    gtag("event", "view_item", {
      send_to: GA4_ID,
      currency: "INR",
      ...(item.value != null && { value: item.value }),
      items: [{ item_id: item.id ?? item.name, item_name: item.name, ...(item.value != null && { price: item.value }) }],
    });
}

/**
 * A form submitted successfully. `adsConversion` marks the lead the ads
 * optimise for (the demo booking) — other forms (signup, contact) are still
 * reported to Meta/GA4 but not counted as a Google Ads conversion.
 */
export function trackLead(lead: {
  name: string;
  method: string;
  eventId?: string;
  email?: string;
  phone?: string;
  adsConversion?: boolean;
}) {
  if (!active()) return;
  setPixelUserData({ em: lead.email?.trim().toLowerCase(), ph: lead.phone?.replace(/\D/g, "") });
  trackPixel("Lead", { content_name: lead.name }, lead.eventId);
  if (GA4_ID) gtag("event", "generate_lead", { send_to: GA4_ID, value: 0, currency: "INR", method: lead.method });
  if (lead.adsConversion) adsConversion(ADS_LEAD_LABEL, lead.eventId ? { transaction_id: lead.eventId } : {});
}

/** WhatsApp or phone link clicked, anywhere on the site. */
export function trackContact(method: "whatsapp" | "phone") {
  if (!active()) return;
  trackPixel("Contact", { content_name: method === "whatsapp" ? "WhatsApp" : "Phone" });
  if (GA4_ID) gtag("event", "contact", { send_to: GA4_ID, method });
  if (method === "whatsapp") adsConversion(ADS_CONTACT_LABEL);
}

export function trackBeginCheckout(item: { name: string; id: string; value: number | null }) {
  if (!active()) return;
  trackPixel("InitiateCheckout", {
    content_name: item.name,
    content_ids: [item.id],
    content_type: "product",
    ...(item.value != null && { value: item.value, currency: "INR" }),
  });
  if (GA4_ID)
    gtag("event", "begin_checkout", {
      send_to: GA4_ID,
      currency: "INR",
      ...(item.value != null && { value: item.value }),
      items: [{ item_id: item.id, item_name: item.name }],
    });
}

const PURCHASE_FLAG = "cs_purchase_tracked:";

/**
 * Only after the server has confirmed the payment. Fires once per payment id,
 * ever, in this browser — the flag survives a refresh or a second tab.
 */
export function trackPurchase(p: { transactionId: string; value: number; name: string; id: string; currency?: string }) {
  if (!active()) return;
  try {
    if (localStorage.getItem(PURCHASE_FLAG + p.transactionId)) return;
    localStorage.setItem(PURCHASE_FLAG + p.transactionId, "1");
  } catch {
    // Storage blocked (private mode): still fire — this code path only runs once per checkout anyway.
  }
  const currency = p.currency || "INR";
  trackPixel(
    "Purchase",
    { value: p.value, currency, content_name: p.name, content_ids: [p.id], content_type: "product" },
    p.transactionId
  );
  if (GA4_ID)
    gtag("event", "purchase", {
      send_to: GA4_ID,
      transaction_id: p.transactionId,
      value: p.value,
      currency,
      items: [{ item_id: p.id, item_name: p.name, price: p.value, quantity: 1 }],
    });
  adsConversion(ADS_PURCHASE_LABEL, { value: p.value, currency, transaction_id: p.transactionId });
}
