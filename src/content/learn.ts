// Recorded-course player settings and per-course copy for the locked-lesson
// prompt. Access itself is decided in Postgres, never here.
import { SW_SIM, SW_SIM_CONFIG, priceLine } from "@/content/swSimulation";
import type { SwSimProduct } from "../../supabase/functions/_shared/swSimulationPricing.ts";

export const LEARN_CONFIG = {
  /** Faint moving email over the video — a deterrent against shared accounts. */
  watermarkOverlay: true,
  /** How often the watched position is saved while playing. */
  progressSaveSeconds: 15,
  /** Move the watermark this often. */
  watermarkMoveSeconds: 30,
  /** Bunny's Player.js build (bunny.net/docs/playback-control-api). */
  playerJsUrl: "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js",
} as const;

export interface CourseOffer {
  /** "Level 1" */
  name: string;
  /** "₹3,999 founding batch (regular ₹7,999) + GST", or null when there's no price yet. */
  price: string | null;
  /** Where "Unlock" goes. */
  path: string;
}

const SW_NAMES: Record<SwSimProduct, string> = { level1: "Level 1", level2: "Level 2", combo: "the Combo" };

/** What the locked-lesson prompt and the "Unlock full course" link say for a course. */
export function courseOffer(courseSlug: string, courseTitle: string): CourseOffer {
  const product = (Object.keys(SW_SIM_CONFIG.courseSlugs) as SwSimProduct[]).find((p) => SW_SIM_CONFIG.courseSlugs[p] === courseSlug);
  if (product) {
    return {
      name: `SOLIDWORKS Simulation ${SW_NAMES[product]}`,
      price: priceLine(product),
      path: product === "level2" ? SW_SIM.level2Path : SW_SIM.path,
    };
  }
  return { name: courseTitle, price: null, path: `/courses/${courseSlug}` };
}
