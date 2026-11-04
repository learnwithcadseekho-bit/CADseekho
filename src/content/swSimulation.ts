// SOLIDWORKS Simulation Level 1 and Level 2 — page copy and syllabus.
//
// Prices, sales state, free modules, Level 2 launch month and access period:
// supabase/functions/_shared/sw-simulation.config.json (also read by checkout).
// The syllabus below is mirrored in the seed migration
// supabase/migrations/20261103090200_sw_simulation_seed.sql; tests/sw-simulation.test.ts
// fails if the two drift apart. Which lessons are actually playable comes
// live from the database (published + video set).

import rawConfig from "../../supabase/functions/_shared/sw-simulation.config.json" with { type: "json" };
import {
  swSimPrice,
  swSimPriceTier,
  swSimPurchasable,
  swSimRegularPrice,
  type SwSimConfig,
  type SwSimProduct,
} from "../../supabase/functions/_shared/swSimulationPricing.ts";

export const SW_SIM_CONFIG = rawConfig as SwSimConfig;

export const SW_SIM = {
  /** Level 1 page (also the course's landing page). */
  path: `/courses/${SW_SIM_CONFIG.courseSlugs.level1}`,
  level2Path: `/courses/${SW_SIM_CONFIG.courseSlugs.level2}`,
  /** Lesson player for Level 1: /learn/solidworks-simulation/<lesson code>. */
  classroomPath: `/learn/${SW_SIM_CONFIG.courseSlugs.level1}`,
  name: "SOLIDWORKS Simulation for Industry Professionals",
  announcement: "New: SOLIDWORKS Simulation Level 1 — Modules 1–2 are free",
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
  /** Level 2: which Simulation licence the module needs. */
  licence?: string;
  lessons: SwSimLesson[];
}

const v = (code: string, title: string, minutes: number): SwSimLesson => ({ code, title, minutes, kind: "video" });
const later = (code: string, title: string, hours: number, free = false): SwSimModule => ({
  code,
  title,
  hours,
  free,
  released: false,
  lessons: [],
});

export const LEVEL1_MODULES: SwSimModule[] = [
  {
    code: "L1-M0",
    title: "Mechanics refresher: stress, strain, Mohr's circle, von Mises",
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
  later("L1-M2", "Reading results: stress, displacement, strain", 3.5, true),
  later("L1-M3", "Materials, failure criteria and factor of safety", 3.5),
  later("L1-M4", "Axial, torsion, bending and beam shear", 3.5),
  later("L1-M5", "Mesh, convergence, stress concentration and singularities", 4),
  later("L1-M6", "Realistic loads and fixtures: split lines, curved beams, reactions", 3.5),
  later("L1-M7", "Symmetry and 2D simplification", 2.5),
  later("L1-CP", "Industrial bracket validation report", 3),
];

const l2 = (code: string, title: string, hours: number, licence: string): SwSimModule => ({
  ...later(code, title, hours),
  licence,
});

export const LEVEL2_MODULES: SwSimModule[] = [
  l2("L2-M1", "Shells and sheet-metal parts", 3.5, "Standard"),
  l2("L2-M2", "Thick-walled and axisymmetric parts", 3.5, "Standard"),
  l2("L2-M3", "Beams, trusses and weldment frames", 3.5, "Standard"),
  l2("L2-M4", "Assemblies: contact and interference fits", 4.5, "Standard"),
  l2("L2-M5", "Bolted joints and connectors", 3.5, "Standard"),
  l2("L2-M6", "Complex structures, mixed mesh and design scenarios", 3.5, "Standard"),
  l2("L2-M7", "Thermal stress, indeterminate structures, strain energy", 2.5, "Professional (thermal)"),
  l2("L2-M8", "Linear buckling", 3, "Professional"),
  l2("L2-M9", "Design studies and optimization", 3.5, "Professional (optimization)"),
  l2("L2-CP", "Industrial assembly validation report", 4, "As needed"),
];

export const totalHours = (modules: SwSimModule[]) => modules.reduce((sum, m) => sum + (m.hours ?? 0), 0);

/** Modules excluding the capstone. */
const moduleCount = (modules: SwSimModule[]) => modules.filter((m) => !m.code.endsWith("-CP")).length;

/** "L1-M0" → "Module 0", "L2-CP" → "Capstone". */
export const moduleLabel = (code: string) => code.replace(/^L\d-/, "").replace(/^M/, "Module ").replace(/^CP$/, "Capstone");

/** Lesson code → its module, across Level 1 (only Level 1 has lessons so far). */
export function findLesson(code: string): { module: SwSimModule; lesson: SwSimLesson } | null {
  for (const module of LEVEL1_MODULES) {
    const lesson = module.lessons.find((l) => l.code === code);
    if (lesson) return { module, lesson };
  }
  return null;
}

export const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const TIER_LABEL: Record<string, string> = { foundingBatch: "founding batch", launch: "launch price", regular: "regular" };

/** "₹3,999 founding batch (regular ₹7,999) + GST" — from the config. */
export function priceLine(product: SwSimProduct, config: SwSimConfig = SW_SIM_CONFIG): string | null {
  const now = swSimPriceTier(config, product);
  if (!now) return null;
  const regular = swSimRegularPrice(config, product);
  return `${formatInr(now.price)} ${TIER_LABEL[now.tier] ?? now.tier}${regular ? ` (regular ${formatInr(regular)})` : ""} + GST`;
}

/** "Offer price for the first 50 users" while the product is on the founding-batch tier with a seat count. */
export function offerNote(product: SwSimProduct, config: SwSimConfig = SW_SIM_CONFIG): string | null {
  const now = swSimPriceTier(config, product);
  const seats = now ? config.prices[now.tier]?.seats : undefined;
  return now?.tier === "foundingBatch" && seats ? `Offer price for the first ${seats} users` : null;
}

/** Is it on sale now (salesOpen + price + not coming soon)? */
export const purchasable = (product: SwSimProduct) => swSimPurchasable(SW_SIM_CONFIG, product);
export const currentPrice = (product: SwSimProduct) => swSimPrice(SW_SIM_CONFIG, product);

// ---------------------------------------------------------------------------
// Course pages

export interface SwSimPage {
  level: "level1" | "level2";
  path: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  label: string;
  title: string;
  tags: string[];
  /** Sidebar rows (the price row is added from the config). */
  info: { label: string; value: string }[];
  overview: string;
  description: string[];
  learn: string[];
  outcomes: { title: string; body: string }[];
  modules: SwSimModule[];
  /** Third column of the Course Modules block. */
  modulesColumn: "Access" | "Licence";
  skills: { group: string; items: string[] }[];
  whoFor: string[];
  prerequisites?: string;
  faqs: { question: string; answer: string }[];
}

// Shown only once the config says how long access lasts.
const accessFaq = SW_SIM_CONFIG.accessPeriod
  ? [{ question: "How long do I have access?", answer: `You get ${SW_SIM_CONFIG.accessPeriod} of access to every lesson, part file and problem.` }]
  : [];
const certificateFaq = {
  question: "Will I get a certificate?",
  answer: "Yes, after your capstone validation report is reviewed and passed.",
};
const teamFaq = {
  question: "Can my company enrol a team?",
  answer: "Yes. Teams of 5 or more get a discounted team licence — contact us.",
};

export const LEVEL1_PAGE: SwSimPage = {
  level: "level1",
  path: SW_SIM.path,
  seoTitle: "SOLIDWORKS Simulation Course Online for Engineers | CADseekho",
  seoDescription:
    "Learn SOLIDWORKS Simulation the industry way: hand calculation first, then FEA. Modules 1–2 free. Built for working design engineers in India.",
  ogImage: "/og/solidworks-simulation.png",
  label: "SOLIDWORKS Simulation · Level 1",
  title: "SOLIDWORKS Simulation Level 1 — Foundation: Linear Static Analysis",
  tags: ["Beginner–Intermediate", "Self-paced", "Modules 1–2 free"],
  info: [
    { label: "Level", value: "Beginner–Intermediate" },
    { label: "Software", value: "SOLIDWORKS Simulation (Standard is enough)" },
    { label: "Category", value: "SOLIDWORKS · FEA" },
    { label: "Format", value: "Self-paced, pre-recorded" },
    { label: "Duration", value: `~${totalHours(LEVEL1_MODULES)} hours (14 h video + 14 h hands-on)` },
    { label: "Modules", value: `${moduleCount(LEVEL1_MODULES)} + capstone` },
    { label: "Free access", value: "Modules 0, 1 and 2 with free sign-up" },
    { label: "Certificate", value: "Yes, on passing the capstone" },
  ],
  overview:
    "SOLIDWORKS Simulation Level 1 — linear static analysis of parts, taught the industry way: hand calculation first, then FEA.",
  description: [
    "You already design parts in SOLIDWORKS. This course teaches you to prove they will hold. You will set up linear static studies that match the real part, read the right result at the right location, and check every number against a hand calculation before you trust it.",
    "Each module follows the same pattern: a short concept lesson, a worked hand calculation, a step-by-step SOLIDWORKS demo, and three problems — guided, industry-style and challenge. You compare your FEA result with the hand result and aim for within 5%.",
    "You will learn how to choose honest fixtures and loads, control the mesh, run a convergence study, tell a real stress concentration from a mesh singularity, pick the correct failure criterion, and report a factor of safety you can defend in a design review.",
    "The course ends with a capstone: a real industrial bracket taken from load path to a two-page validation report.",
  ],
  learn: [
    "Explain how FEA works: nodes, elements, degrees of freedom and stiffness.",
    "State the assumptions of linear static analysis and when they break.",
    "Set up a complete static study: material, fixtures, loads, mesh, run, check.",
    "Read stress components, principal stress, von Mises, displacement and strain correctly.",
    "Use probe, path graphs, section clipping, iso clipping, sensors and reports.",
    "Create custom materials for Indian grades such as IS 2062 E250 and EN8.",
    "Choose von Mises, Tresca, max normal stress or Mohr-Coulomb for the material.",
    "Produce factor-of-safety plots without the common traps.",
    "Reproduce axial, torsion, bending and beam-shear results and match hand calculations.",
    "Apply torque, moments and simply supported conditions honestly on solid models.",
    "Run mesh convergence studies and know when to stop refining.",
    "Tell stress concentrations from singularities at sharp corners and fixed edges.",
    "Use split lines, bearing loads and remote loads to load only where contact happens.",
    "Check reaction forces and equilibrium on every study.",
    "Apply curved-beam theory where the straight-beam formula fails.",
    "Reduce models with planar and circular symmetry, plane stress and plane strain.",
    "Write a one-page validation sheet for every result.",
  ],
  outcomes: [
    {
      title: "Understand FEA Fundamentals",
      body: "Explain how geometry is split into elements and solved for displacement, then stress, and what that means for accuracy.",
    },
    {
      title: "Build Honest Simulation Models",
      body: "Choose material data, fixtures and loads that represent the real part, its supports and its contact areas.",
    },
    {
      title: "Read Results Correctly",
      body: "Select the stress or displacement component that matches the design question and report it at a meaningful location.",
    },
    {
      title: "Apply the Right Failure Criterion",
      body: "Calculate factor of safety with the criterion that suits ductile or brittle materials.",
    },
    {
      title: "Validate Every Result",
      body: "Compare FEA with classical hand calculations for axial, bending, torsion, combined and curved-beam cases.",
    },
    {
      title: "Prove Mesh Convergence",
      body: "Show that the reported result does not change with further refinement, and identify singularities.",
    },
    {
      title: "Simplify Models Safely",
      body: "Use symmetry and 2D studies only when geometry, material, loads and fixtures allow it.",
    },
    {
      title: "Communicate Engineering Results",
      body: "Produce a concise validation report with assumptions, set-up, convergence evidence and a clear pass/redesign verdict.",
    },
  ],
  modules: LEVEL1_MODULES,
  modulesColumn: "Access",
  skills: [
    {
      group: "FEA Fundamentals",
      items: ["Finite Element Method", "Nodes, Elements and Degrees of Freedom", "Stiffness Matrix Concept", "Linear Static Assumptions", "FEA Workflow"],
    },
    {
      group: "SOLIDWORKS Simulation",
      items: ["Simulation Study Tree", "Simulation Advisor", "Static Studies", "Units and Result Options", "Study Naming and Copying", "Reports"],
    },
    {
      group: "Materials & Failure",
      items: [
        "Linear Elastic Isotropic Materials",
        "Custom Material Libraries",
        "Hooke's Law and Poisson Effect",
        "von Mises and Tresca",
        "Max Normal Stress and Mohr-Coulomb",
        "Factor of Safety",
      ],
    },
    {
      group: "Fixtures & Loads",
      items: [
        "Fixed Geometry",
        "Roller/Slider",
        "Fixed Hinge",
        "Reference Geometry Restraints",
        "Symmetry and Circular Symmetry",
        "Force, Torque and Pressure",
        "Bearing Load",
        "Remote Load",
        "Split Lines",
        "Soft Springs and Inertial Relief",
      ],
    },
    {
      group: "Meshing",
      items: [
        "Solid Tetrahedral Elements",
        "Draft vs High-Quality Elements",
        "Standard, Curvature-Based and Blended Mesh",
        "Mesh Control",
        "Aspect Ratio and Jacobian",
        "Mesh Convergence",
      ],
    },
    {
      group: "Results & Validation",
      items: [
        "Stress Components and Principal Stress",
        "von Mises Stress",
        "Displacement and Strain",
        "Probe and Path Graphs",
        "Section and Iso Clipping",
        "Reaction Forces",
        "Stress Concentration (Kt)",
        "Singularities",
        "Hand Calculation vs FEA",
        "Validation Reports",
      ],
    },
  ],
  whoFor: [
    "Design engineers who use SOLIDWORKS daily",
    "Machine, product and fixture/tooling designers",
    "Sheet-metal and weldment designers moving into simulation",
    "Mechanical engineers preparing for a CAE or design-validation role",
    "Final-year students with SOLIDWORKS modelling skills",
  ],
  prerequisites:
    "SOLIDWORKS part and assembly modelling, and strength of materials at diploma/BE level. Module 0 refreshes the formulas.",
  faqs: [
    {
      question: "Is this course live or self-paced?",
      answer: "Self-paced. All lessons are pre-recorded, so you can watch anytime. New modules are released one at a time until the course is complete.",
    },
    {
      question: "Are Modules 1 and 2 really free?",
      answer: "Yes. Create a free account and watch Modules 0, 1 and 2 completely, with their part files and problems.",
    },
    {
      question: "Which SOLIDWORKS licence do I need?",
      answer: "SOLIDWORKS Simulation Standard covers all of Level 1. Version 2020 or later is recommended.",
    },
    { question: "Do I get the part files?", answer: "Yes. Every module includes SOLIDWORKS start files and problems with answers." },
    ...accessFaq,
    certificateFaq,
    { question: "Do I get a GST invoice?", answer: "Yes, for every paid purchase." },
    teamFaq,
  ],
};

export const LEVEL2_PAGE: SwSimPage = {
  level: "level2",
  path: SW_SIM.level2Path,
  seoTitle: "SOLIDWORKS Simulation Level 2: Professional | CADseekho",
  seoDescription:
    "Shells, weldment frames, assemblies, bolted joints, thermal stress, buckling and optimization in SOLIDWORKS Simulation — every result validated by hand.",
  ogImage: "/og/solidworks-simulation-level-2.png",
  label: "SOLIDWORKS Simulation · Level 2",
  title: "SOLIDWORKS Simulation Level 2 — Professional: Shells, Frames, Assemblies and Advanced Studies",
  tags: ["Intermediate–Advanced", "Self-paced", SW_SIM_CONFIG.level2Status === "coming-soon" ? "Coming soon" : "Available now"],
  info: [
    { label: "Level", value: "Intermediate–Advanced" },
    { label: "Software", value: "SOLIDWORKS Simulation (Professional needed for buckling, thermal and optimization modules)" },
    { label: "Category", value: "SOLIDWORKS · FEA" },
    { label: "Format", value: "Self-paced, pre-recorded" },
    { label: "Duration", value: `~${totalHours(LEVEL2_MODULES)} hours (18 h video + 17 h hands-on)` },
    { label: "Modules", value: `${moduleCount(LEVEL2_MODULES)} + capstone` },
    { label: "Prerequisite", value: "SOLIDWORKS Simulation Level 1 or equivalent experience" },
    { label: "Certificate", value: "Yes, on passing the capstone" },
  ],
  overview:
    "SOLIDWORKS Simulation Level 2 — shells, beams, assemblies, contact, bolted joints, thermal stress, buckling and design optimization, every result validated against classical solutions.",
  description: [
    "Level 2 takes you from single parts to the models engineers actually deliver: sheet-metal parts as shells, weldment frames as beams, and assemblies with contact, shrink fits and bolted joints.",
    "You will learn when to idealise a model and when not to, how to set up contact and bolt connectors that behave like the real joint, and how to run thermal stress, linear buckling and design-optimization studies. Each topic is verified with a classical method: Lamé equations for thick cylinders, interference-fit equations for shrink fits, bolt preload and bolt-group calculations, and Euler buckling.",
    "The same course pattern continues: concept, hand calculation, guided SOLIDWORKS demo, and three problems per module. Learners using Simulation Standard get alternative exercises for the three Professional-only modules.",
    "The course ends with a capstone on a gearbox output assembly: shaft, shrink-fit hub, bolted cover and weldment base frame, reported in a two-page validation report.",
  ],
  learn: [
    "Decide when a part should be modelled as a shell, a beam or a solid.",
    "Create shells from surfaces, sheet metal and solids; set thickness and offsets.",
    "Analyse thin-wall and thick-wall pressure vessels and verify with classical formulas.",
    "Plot radial and tangential stress in cylindrical coordinates.",
    "Use 2D axisymmetric studies for revolved parts.",
    "Model weldment frames with beam and truss elements; read member force diagrams.",
    "Set up global and local contact: bonded, no-penetration and shrink fit.",
    "Verify shrink-fit pressure and hoop stress against interference-fit equations.",
    "Model bolted joints with preload, and read bolt forces and clamping pressure.",
    "Combine solids, shells and beams in one mixed-mesh study.",
    "Apply temperature loads and solve statically indeterminate structures.",
    "Run linear buckling studies and check Euler validity.",
    "Run what-if design studies and mass optimization with stress and displacement constraints.",
    "Present a design-review decision backed by simulation evidence.",
  ],
  outcomes: [
    { title: "Idealise Models Correctly", body: "Choose solid, shell, beam or 2D representations that save time without losing accuracy." },
    {
      title: "Analyse Pressure-Containing Parts",
      body: "Solve thin- and thick-walled vessels and verify them with membrane and Lamé equations.",
    },
    { title: "Analyse Frames and Structures", body: "Model weldment frames and trusses and check members by hand." },
    { title: "Simulate Assemblies", body: "Define contact, shrink fits and bolted joints that represent the real interfaces." },
    {
      title: "Evaluate Thermal and Stability Behaviour",
      body: "Run thermal stress and linear buckling studies and judge whether the results are valid.",
    },
    {
      title: "Optimise Designs",
      body: "Use design studies to reduce mass while meeting stress and stiffness limits, then round to manufacturable sizes.",
    },
    { title: "Validate Every Result", body: "Compare FEA with classical solutions and convergence evidence before accepting it." },
    {
      title: "Communicate Engineering Results",
      body: "Write validation reports and design-review summaries a lead engineer or customer will accept.",
    },
  ],
  modules: LEVEL2_MODULES,
  modulesColumn: "Licence",
  skills: [
    {
      group: "Shells & Sheet Metal",
      items: ["Thin and Thick Shell Elements", "Shells from Surfaces and Sheet Metal", "Mid-Surface Conversion", "Shell Thickness and Offset", "Top/Bottom Shell Stresses"],
    },
    {
      group: "Pressure Vessels & Axisymmetry",
      items: ["Thin-Wall Hoop and Axial Stress", "Thick-Wall (Lamé) Stresses", "Cylindrical Coordinate Results", "2D Axisymmetric Studies", "Hydrostatic Pressure"],
    },
    {
      group: "Beams & Frames",
      items: ["Beam and Truss Elements", "Weldment Profiles", "Joints and End Releases", "Axial, Shear and Moment Diagrams", "Member Checks"],
    },
    {
      group: "Assembly Simulation",
      items: ["Bonded Contact", "No Penetration", "Shrink Fit", "Contact Pressure", "Bolt Connectors and Preload", "Pins, Springs and Rigid Links", "Joint Separation Checks"],
    },
    {
      group: "Thermal & Stability",
      items: ["Temperature Loads", "Thermal Stress", "Statically Indeterminate Structures", "Strain Energy", "Linear Buckling", "Buckling Load Factor", "Euler and Johnson Validity"],
    },
    {
      group: "Design Studies",
      items: ["Parametric What-If Studies", "Design Variables", "Constraints and Sensors", "Mass Optimization", "Local Trend Graphs"],
    },
    {
      group: "Validation & Reporting",
      items: ["Classical vs FEA Comparison", "Mesh Convergence Evidence", "Mixed-Mesh Checks", "Design-Review Presentations", "Simulation Reports"],
    },
  ],
  whoFor: [
    "Engineers who have completed Level 1 or already run static studies confidently",
    "Designers of sheet-metal enclosures, weldment frames and machine bases",
    "Engineers working on shafts, hubs, bolted joints and pressure-containing parts",
    "Design teams that want validated simulation in their release process",
  ],
  faqs: [
    { question: "Is this course live or self-paced?", answer: "Self-paced. All lessons are pre-recorded and released module by module." },
    {
      question: "Do I need Level 1 first?",
      answer: "Recommended. If you skip it, you should be able to run and validate a plate-with-hole stress concentration study on your own.",
    },
    {
      question: "Which SOLIDWORKS licence do I need?",
      answer: "Modules 1–6 run on Simulation Standard. Modules 7–9 need Simulation Professional; Standard users get hand-calculation and what-if alternatives.",
    },
    {
      question: "When will it be available?",
      answer: `${SW_SIM_CONFIG.level2Launch ? `Planned for ${SW_SIM_CONFIG.level2Launch}. ` : ""}Join the waitlist to get the launch price.`,
    },
    ...accessFaq,
    certificateFaq,
    teamFaq,
  ],
};

// ---------------------------------------------------------------------------
// Combo card (both pages)

export const COMBO = {
  label: "Best value",
  title: "SOLIDWORKS Simulation Level 1 + Level 2",
  line: `Both levels, ${moduleCount(LEVEL1_MODULES) + moduleCount(LEVEL2_MODULES)} modules, 2 capstones, ~${
    totalHours(LEVEL1_MODULES) + totalHours(LEVEL2_MODULES)
  } hours. Get every Level 2 module the day it is released.`,
  button: "Get the combo",
};

// ---------------------------------------------------------------------------
// Courses page cards

export interface SwSimListingCard {
  key: SwSimProduct;
  tag: string;
  title: string;
  description: string;
  button: string;
  to: string;
}

const level2Soon = SW_SIM_CONFIG.level2Status === "coming-soon";

export const LISTING_CARDS: SwSimListingCard[] = [
  {
    key: "level1",
    tag: "New · Modules 1–2 free",
    title: "SOLIDWORKS Simulation Level 1 — Foundation",
    description: `Linear static analysis of parts, every result checked by hand. Self-paced, ~${totalHours(LEVEL1_MODULES)} h.`,
    button: "Start free",
    to: SW_SIM.path,
  },
  {
    key: "level2",
    tag: level2Soon ? "Coming soon" : "New",
    title: "SOLIDWORKS Simulation Level 2 — Professional",
    description: `Shells, frames, assemblies, bolted joints, thermal, buckling and optimization. Self-paced, ~${totalHours(LEVEL2_MODULES)} h.`,
    button: level2Soon ? "Join waitlist" : "View course",
    to: SW_SIM.level2Path,
  },
  {
    key: "combo",
    tag: "Best value",
    title: "SOLIDWORKS Simulation Level 1 + 2",
    description: "Both levels at the founding price, with Level 2 modules as they release.",
    button: "Get the combo",
    to: `${SW_SIM.path}#combo`,
  },
];

/** The retired live course, now a 301 to Level 1 (src/content/legacyRedirects.ts). */
export const RETIRED_SW_SIM_SLUG = "solidworks-simulation-for-beginners";

/** Course rows the cards above stand in for, plus the retired course — left out of database-driven listings. */
export const SW_SIM_LISTED_ELSEWHERE: readonly string[] = [...Object.values(SW_SIM_CONFIG.courseSlugs), RETIRED_SW_SIM_SLUG];

/** Course slugs that get the "NEW" tag on regular course cards. */
export const NEW_COURSE_SLUGS: readonly string[] = [SW_SIM_CONFIG.courseSlugs.level1];

export const INTEREST_OPTIONS: { value: "level1" | "level2" | "combo" | "team"; label: string }[] = [
  { value: "level1", label: "Level 1: Foundation" },
  { value: "level2", label: "Level 2: Professional" },
  { value: "combo", label: "Combo (Level 1 + Level 2)" },
  { value: "team", label: "Team (5 or more engineers)" },
];

/** Remembered when someone clicks "Sign up free" here, so the signup page can report sw_sim_free_signup. */
export const SIGNUP_INTENT_KEY = "cs_signup_intent";
export const SIGNUP_INTENT = "sw-sim";
