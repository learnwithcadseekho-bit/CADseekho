// Ad attribution for the demo form: the UTM tags and click ids on the URL the
// visitor landed with, kept for the rest of the tab session so a lead booked
// three pages later still says which ad it came from.

const KEY = "cs_attribution";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"] as const;

export type Attribution = Partial<Record<(typeof PARAMS)[number], string>> & { landing_page?: string };

/** Called once per page load. A new ad click (any tracked param present) replaces what was stored. */
export function captureAttribution() {
  try {
    const url = new URL(window.location.href);
    const found: Attribution = {};
    for (const p of PARAMS) {
      const v = url.searchParams.get(p);
      if (v) found[p] = v.slice(0, 200);
    }
    if (Object.keys(found).length === 0 && sessionStorage.getItem(KEY)) return;
    found.landing_page = url.pathname;
    sessionStorage.setItem(KEY, JSON.stringify(found));
  } catch {
    // Storage blocked — the lead just goes in without attribution.
  }
}

export function getAttribution(): Attribution {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Attribution;
  } catch {
    return {};
  }
}
