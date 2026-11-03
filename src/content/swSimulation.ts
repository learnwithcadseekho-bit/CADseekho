// "SOLIDWORKS Simulation for Industry Professionals" — page copy and syllabus.
//
// Prices, sales state and free modules: supabase/functions/_shared/sw-simulation.config.json
// (also read by checkout). The syllabus below is mirrored in the seed
// migration supabase/migrations/20261103090200_sw_simulation_seed.sql;
// tests/sw-simulation.test.ts fails if the two drift apart. Which lessons
// are actually playable comes live from the database (published + video set).

import rawConfig from "../../supabase/functions/_shared/sw-simulation.config.json" with { type: "json" };
import { swSimPrice, swSimPurchasable, type SwSimConfig, type SwSimProduct } from "../../supabase/functions/_shared/swSimulationPricing.ts";
import type { CourseWithCategory } from "@/types/course";

export const SW_SIM_CONFIG = rawConfig as SwSimConfig;

export const SW_SIM = {
  path: `/courses/${SW_SIM_CONFIG.slug}`,
  /** Lesson player: /classroom/solidworks-simulation/<lesson code>. */
  classroomPath: `/classroom/${SW_SIM_CONFIG.slug}`,
  name: "SOLIDWORKS Simulation for Industry Professionals",
  level1Title: "SOLIDWORKS Simulation — Level 1: Foundation",
  level2Title: "SOLIDWORKS Simulation — Level 2: Professional",
  seoTitle: "SOLIDWORKS Simulation Course Online for Engineers | CADseekho",
  seoDescription:
    "Learn SOLIDWORKS Simulation the industry way: hand calculation first, then FEA. Module 1 free. Built for working design engineers in India.",
  ogImage: "/og/solidworks-simulation.png",
  badge: "New · Module 1 free",
  subtitle:
    "You already design in SOLIDWORKS. Now prove it will hold — set up honest studies, check every result by hand, and report a number you can defend.",
  announcement: "New: SOLIDWORKS Simulation for Industry Professionals — Module 1 is free",
} as const;

export interface SwSimLesson {
  code: string;
  title: string;
  minutes: number | null;
  kind: "video" | "quiz" | "problems" | "test";
}

export interface SwSimModule {
  code: string;
  title: string;
  hours: number | null;
  free: boolean;
  /** Released modules can be played (once their lessons are published); the rest show "Coming soon". */
  released: boolean;
  /** Optional "Coming soon" note, e.g. "Week of 24 Nov". */
  releaseLabel?: string;
  lessons: SwSimLesson[];
}

const v = (code: string, title: string, minutes: number): SwSimLesson => ({ code, title, minutes, kind: "video" });

export const LEVEL1_MODULES: SwSimModule[] = [
  {
    code: "L1-M0",
    title: "Mechanics refresher",
    hours: 1,
    free: true,
    released: true,
    lessons: [
      v("M0.1", "Stress, strain and Hooke's law", 10),
      v("M0.2", "Axial, bending, torsion and shear formulas", 15),
      v("M0.3", "Principal stress and Mohr's circle", 15),
      v("M0.4", "Von Mises stress", 10),
      { code: "M0-QUIZ", title: "M0 Quiz", minutes: null, kind: "quiz" },
    ],
  },
  {
    code: "L1-M1",
    title: "How FEA works and your first static study",
    hours: 3.5,
    free: true,
    released: true,
    lessons: [
      v("M1.1", "Why designers need FEA (and what it cannot do)", 15),
      v("M1.2", "Nodes, elements, degrees of freedom, stiffness", 25),
      v("M1.3", "Element types and linear-static assumptions", 20),
      v("M1.4", "SOLIDWORKS Simulation interface and workflow", 20),
      v("M1.5", "First study end to end: cantilever demo", 40),
      { code: "M1-PROB", title: "M1 Problems P1–P3", minutes: null, kind: "problems" },
      { code: "M1-TEST", title: "M1 Test", minutes: null, kind: "test" },
    ],
  },
  { code: "L1-M2", title: "Reading results: stress, displacement, strain", hours: 3.5, free: false, released: false, lessons: [] },
  { code: "L1-M3", title: "Materials, failure criteria and factor of safety", hours: 3.5, free: false, released: false, lessons: [] },
  { code: "L1-M4", title: "Axial, torsion, bending and beam shear", hours: 3.5, free: false, released: false, lessons: [] },
  { code: "L1-M5", title: "Mesh, convergence, stress concentration, singularities", hours: 4, free: false, released: false, lessons: [] },
  {
    code: "L1-M6",
    title: "Realistic loads and fixtures: split lines, curved beams, reactions",
    hours: 3.5,
    free: false,
    released: false,
    lessons: [],
  },
  { code: "L1-M7", title: "Symmetry and 2D simplification", hours: 2.5, free: false, released: false, lessons: [] },
  { code: "L1-CP", title: "Capstone: industrial bracket validation report", hours: 3, free: false, released: false, lessons: [] },
];

const l2 = (code: string, title: string): SwSimModule => ({ code, title, hours: null, free: false, released: false, lessons: [] });

export const LEVEL2_MODULES: SwSimModule[] = [
  l2("L2-M1", "Shells and sheet-metal parts"),
  l2("L2-M2", "Thick-walled and axisymmetric parts"),
  l2("L2-M3", "Beams, trusses and weldment frames"),
  l2("L2-M4", "Assemblies: contact and interference fits"),
  l2("L2-M5", "Bolted joints and connectors"),
  l2("L2-M6", "Complex structures, mixed mesh and design scenarios"),
  l2("L2-M7", "Thermal stress, indeterminate structures, strain energy"),
  l2("L2-M8", "Linear buckling"),
  l2("L2-M9", "Design studies and optimization"),
  l2("L2-CP", "Capstone: industrial assembly validation report"),
];

export const totalHours = (modules: SwSimModule[]) => modules.reduce((sum, m) => sum + (m.hours ?? 0), 0);

/** Lesson code → its module, across Level 1 (only Level 1 has lessons so far). */
export function findLesson(code: string): { module: SwSimModule; lesson: SwSimLesson } | null {
  for (const module of LEVEL1_MODULES) {
    const lesson = module.lessons.find((l) => l.code === code);
    if (lesson) return { module, lesson };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page copy

export const WHO_FOR =
  "Machine designers, product engineers, fixture and tooling designers, and sheet-metal/weldment designers who model in SOLIDWORKS and are now asked “will it hold?” before a prototype is built. You need SOLIDWORKS part/assembly skills and diploma/BE-level strength of materials. Module 0 refreshes the formulas.";

export const DIFFERENT: { title: string; body: string }[] = [
  { title: "Hand calculation first", body: "Every problem is solved on paper, then in SOLIDWORKS, and compared. Target: within 5%." },
  { title: "Industry problems", body: "Brackets, shafts, C-frames, shrink fits, bolted joints, weldment frames. Not textbook toys." },
  { title: "Mesh you can defend", body: "Convergence studies, stress concentration vs singularity, and where to read stress." },
  { title: "Validation report", body: "Every module ends with a one-page sheet your lead engineer or customer will accept." },
];

export const WHAT_YOU_GET: string[] = [
  "Video lessons",
  "SOLIDWORKS part files (start and reference)",
  "Slide notes (PDF)",
  "Problems with answers",
  "Validation sheet template",
  "Weekend live doubt sessions (paid learners)",
  "Certificate tied to a graded capstone",
];

export const SOFTWARE_NOTE = {
  level1: "SOLIDWORKS Simulation Standard is enough for all of Level 1.",
  level2: "Some Level 2 modules (buckling, thermal, optimization) need Simulation Professional. Standard users get alternative exercises.",
  version: "SOLIDWORKS 2020 or later.",
};

export const FAQS: { question: string; answer: string }[] = [
  {
    question: "Which SOLIDWORKS licence do I need?",
    answer:
      "Level 1 runs on SOLIDWORKS Simulation Standard. Some Level 2 modules (buckling, thermal, optimization) need Simulation Professional; Standard users get alternative exercises.",
  },
  { question: "Which version?", answer: "2020 or later. The workflow is the same across versions." },
  {
    question: "Is Module 1 really free?",
    answer: "Yes. Create a free account and watch Module 0 and Module 1 completely, with part files.",
  },
  { question: "Do I get a GST invoice?", answer: "Yes, for all paid purchases." },
  {
    question: "Is this live or recorded?",
    answer: "Recorded lessons released module by module, plus weekend live doubt sessions for paid learners.",
  },
  {
    question: "Can my company enrol a team?",
    answer: "Yes — teams of 5 or more get a discounted team licence. Use the notify form and choose “Team”.",
  },
];

export const INTEREST_OPTIONS: { value: "level1" | "level2" | "combo" | "team"; label: string }[] = [
  { value: "level1", label: "Level 1: Foundation" },
  { value: "level2", label: "Level 2: Professional" },
  { value: "combo", label: "Combo (Level 1 + Level 2)" },
  { value: "team", label: "Team (5 or more engineers)" },
];

// ---------------------------------------------------------------------------
// Pricing (from the config)

export interface SwSimPlan {
  product: SwSimProduct;
  title: string;
  blurb: string;
  price: number | null;
  /** On sale right now (salesOpen + a price + not coming soon). */
  purchasable: boolean;
  comingSoon: boolean;
  courseSlug: string;
}

export function swSimPlans(config: SwSimConfig = SW_SIM_CONFIG): SwSimPlan[] {
  const l2Soon = config.level2Status === "coming-soon";
  const plan = (product: SwSimProduct, title: string, blurb: string, comingSoon = false): SwSimPlan => ({
    product,
    title,
    blurb,
    price: swSimPrice(config, product),
    purchasable: swSimPurchasable(config, product),
    comingSoon,
    courseSlug: config.courseSlugs[product],
  });
  return [
    plan("level1", "Level 1: Foundation", `Linear static analysis of parts · M0–M7 + capstone · ${totalHours(LEVEL1_MODULES)} hours`),
    plan("level2", "Level 2: Professional", "Shells, assemblies, bolted joints, buckling, thermal, optimization", l2Soon),
    plan("combo", "Combo: Level 1 + Level 2", l2Soon ? "Level 1 now, Level 2 as it releases" : "Both levels", false),
  ];
}

export const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Remembered when someone clicks "Sign up free" here, so the signup page can report sw_sim_free_signup. */
export const SIGNUP_INTENT_KEY = "cs_signup_intent";
export const SIGNUP_INTENT = "sw-sim";

/** "L1-M0" → "Module 0", "L2-CP" → "Capstone". */
export const moduleLabel = (code: string) => code.replace(/^L\d-/, "").replace(/^M/, "Module ").replace(/^CP$/, "Capstone");

// ---------------------------------------------------------------------------
// Listings

/** Course slugs that get the "NEW" tag on course cards. */
export const NEW_COURSE_SLUGS: readonly string[] = [SW_SIM_CONFIG.courseSlugs.level1];

/** Shown on /courses until the Level 1 row is published in the database (then the live row is used). */
export const SW_SIM_LISTING_CARD: CourseWithCategory = {
  id: "sw-simulation-static",
  category_id: "",
  title: SW_SIM.name,
  slug: SW_SIM_CONFIG.courseSlugs.level1,
  short_description: "Linear static FEA of parts the industry way: hand calculation first, then SOLIDWORKS Simulation. Module 1 free.",
  description: null,
  level: "intermediate",
  software: "SOLIDWORKS Simulation",
  prerequisites: null,
  image: null,
  format: "self_paced",
  price: null,
  original_price: null,
  next_batch_date: null,
  registration_count: 0,
  manual_enrolled_count: null,
  seat_capacity: null,
  live_class_schedule: null,
  is_featured: false,
  is_published: true,
  created_at: "2026-11-03T00:00:00Z",
  updated_at: "2026-11-03T00:00:00Z",
  category: { name: "SolidWorks", slug: "solidworks" },
};
