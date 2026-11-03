// Prices for the SOLIDWORKS Simulation courses, read from
// sw-simulation.config.json — the single source of truth for the landing
// page (src/pages/SwSimulation) and for checkout (create-razorpay-order).
// Free of Deno/Vite APIs so the same code runs in the Edge Function, the
// browser and the Node tests. The config is passed in, not imported, so each
// side can load the JSON its own way.

export type SwSimProduct = "level1" | "level2" | "combo";
export const SW_SIM_PRODUCTS: readonly SwSimProduct[] = ["level1", "level2", "combo"];

export interface SwSimConfig {
  slug: string;
  salesOpen: boolean;
  currency: string;
  gstNote: string;
  prices: Record<string, Partial<Record<SwSimProduct, number>> & { seats?: number }>;
  activePriceTier: string;
  freeModules: string[];
  level2Status: string;
  courseSlugs: Record<SwSimProduct, string>;
}

/** Which product a course slug is, or null if the config doesn't manage that course. */
export function swSimProductForSlug(config: SwSimConfig, slug: string): SwSimProduct | null {
  return SW_SIM_PRODUCTS.find((p) => config.courseSlugs[p] === slug) ?? null;
}

/** Active-tier price in rupees (before GST), or null when the product has no price in this tier. */
export function swSimPrice(config: SwSimConfig, product: SwSimProduct): number | null {
  const tier = config.prices[config.activePriceTier];
  if (!tier) throw new Error(`sw-simulation config: activePriceTier "${config.activePriceTier}" has no prices`);
  const price = tier[product];
  return typeof price === "number" && price > 0 ? price : null;
}

/** Level 2 (and so the Combo, which includes it) is on sale only once it's out of "coming-soon". */
export function swSimPurchasable(config: SwSimConfig, product: SwSimProduct): boolean {
  if (!config.salesOpen) return false;
  if (swSimPrice(config, product) === null) return false;
  if (product === "level2" && config.level2Status === "coming-soon") return false;
  return true;
}

/**
 * What create-razorpay-order charges for a config-managed course: the amount
 * in paise, or why it can't be sold right now. Combo pre-orders are allowed
 * while Level 2 is coming soon (the combo enrolls into Level 2 as well).
 */
export function swSimCheckout(
  config: SwSimConfig,
  slug: string
): { ok: true; product: SwSimProduct; amountPaise: number } | { ok: false; error: string } | null {
  const product = swSimProductForSlug(config, slug);
  if (!product) return null;
  if (!config.salesOpen) return { ok: false, error: "Enrollment hasn't opened yet — join the waitlist and we'll tell you first." };
  if (!swSimPurchasable(config, product)) return { ok: false, error: "This course isn't on sale yet." };
  return { ok: true, product, amountPaise: Math.round(swSimPrice(config, product)! * 100) };
}
