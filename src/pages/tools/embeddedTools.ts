// Free reference tools served as static pages from public/tools/<slug>.html and
// embedded at /tools/<slug> by EmbeddedToolPage. (The beam calculator has its
// own page, BeamCalculatorPage, because of its longer guide.)
export interface EmbeddedTool {
  slug: string;
  /** Card / nav tag, e.g. "Calculator" or "Reference chart". */
  label: string;
  title: string;
  lead: string;
  seoTitle: string;
  seoDescription: string;
  /** One line for the Resources hub card. */
  summary: string;
  tags: string[];
  intro: string;
  steps: string[];
  faqs: { question: string; answer: string }[];
}

export const EMBEDDED_TOOLS: EmbeddedTool[] = [
  {
    slug: "iso-fits-tolerance-calculator",
    label: "Calculator",
    title: "ISO Fits & Tolerances Calculator",
    lead: "Hole and shaft limits, clearance or interference, and tolerance zones to scale — ISO 286 hole-basis fits.",
    seoTitle: "ISO Fits & Tolerances Calculator (ISO 286) – H7/g6 Limits",
    seoDescription:
      "Free ISO 286 fits calculator: enter a nominal size and a fit like H7/g6 to get hole and shaft limits, maximum and minimum clearance or interference, and a tolerance zone diagram.",
    summary: "Limits, clearance or interference and a to-scale zone diagram for any hole-basis fit like H7/g6.",
    tags: ["ISO 286", "GD&T"],
    intro:
      "Enter a nominal size and pick a preferred fit (H11/c11 to H7/s6) or build your own hole and shaft combination. The calculator returns the upper and lower limits of the hole and shaft, the maximum and minimum clearance (or interference), the fit type, and a to-scale diagram of both tolerance zones about the zero line.",
    steps: [
      "Enter the nominal size in mm (1–120 mm).",
      "Choose a preferred fit, or set the hole letter and IT grade and the shaft letter and IT grade yourself.",
      "Read the hole and shaft limits, the clearance or interference, and whether it is a clearance, transition or interference fit.",
      "Use the step-by-step working to see how the IT grade and fundamental deviation give each limit.",
    ],
    faqs: [
      {
        question: "Which standard does it use?",
        answer:
          "ISO 286-1 and ISO 286-2 standard tolerance grades and fundamental deviations for nominal sizes up to 120 mm. IS 919 is the Indian equivalent. Always confirm critical tolerances against the current standard.",
      },
      {
        question: "What is the difference between clearance, transition and interference fits?",
        answer:
          "A clearance fit always leaves a gap between hole and shaft, an interference fit always needs force or heat to assemble, and a transition fit can give either a small clearance or a small interference depending on the actual sizes.",
      },
      { question: "Is it free? Do I need to sign in?", answer: "Yes, it's free and needs no sign-in." },
    ],
  },
  {
    slug: "failure-theories-calculator",
    label: "Calculator",
    title: "Failure Theories Calculator",
    lead: "von Mises, Tresca, Rankine and Coulomb–Mohr — principal stresses, factor of safety and your stress point on the failure envelope.",
    seoTitle: "Failure Theories Calculator – von Mises, Tresca & Mohr",
    seoDescription:
      "Free failure theories calculator for plane stress: von Mises, Tresca, maximum normal stress and Coulomb–Mohr. Enter σx, σy and τxy for principal stresses, factor of safety and failure envelopes.",
    summary: "Enter σx, σy and τxy for principal stresses, factor of safety and failure envelopes under each theory.",
    tags: ["Strength", "FoS"],
    intro:
      "Enter a plane-stress state and a material. The calculator finds the principal stresses and principal angle, the von Mises equivalent stress, and the factor of safety under each failure theory, then plots your stress point on the failure envelopes in the σ₁–σ₂ plane with Mohr's circle alongside.",
    steps: [
      "Enter σx, σy and τxy in MPa (tension positive, compression negative).",
      "Choose ductile (enter yield strength Sy) or brittle (enter Sut and Suc).",
      "Read the principal stresses, the factor of safety under each theory and the safe / marginal / fails verdict.",
      "Check the envelope plot and the step-by-step hand calculation.",
    ],
    faqs: [
      {
        question: "Which failure theory should I use?",
        answer:
          "For ductile metals use von Mises (distortion energy) — it matches test data best and is the equivalent stress FEA tools show by default; Tresca is slightly more conservative. For brittle materials like cast iron use Coulomb–Mohr, which accounts for different tensile and compressive strengths.",
      },
      {
        question: "Does it handle 3D stress?",
        answer: "It assumes plane stress (σz = τxz = τyz = 0), which covers most thin parts and surface points where failure starts.",
      },
      { question: "Is it free? Do I need to sign in?", answer: "Yes, it's free and needs no sign-in." },
    ],
  },
  {
    slug: "mesh-quality-metrics-chart",
    label: "Reference chart",
    title: "Mesh Quality Metrics Chart",
    lead: "Skewness, orthogonal quality, element quality, aspect ratio and Jacobian ratio — check your mesh against the ANSYS quality spectrums.",
    seoTitle: "Mesh Quality Metrics Chart – Skewness & Aspect Ratio",
    seoDescription:
      "Free ANSYS mesh quality reference: skewness and orthogonal quality spectrums, element quality, aspect ratio and Jacobian ratio. Rate your mesh statistics and calculate skewness from element angles.",
    summary: "Plot your skewness, orthogonal quality and aspect ratio on the ANSYS mesh quality spectrums.",
    tags: ["ANSYS", "Meshing"],
    intro:
      "Enter the worst-case mesh metrics from ANSYS Meshing and see each one rated and plotted on its quality spectrum, with guidance for structural (Mechanical) and CFD (Fluent) meshes. You can also calculate equiangular skewness from a triangle's or quad's angles, and see the usual fixes for each bad metric.",
    steps: [
      "In ANSYS Meshing, open Mesh → Quality → Mesh Metric and note the worst value of each metric.",
      "Choose structural or CFD and enter skewness, orthogonal quality, element quality, aspect ratio and Jacobian ratio.",
      "Read the rating for each metric and the overall verdict.",
      "Use the fixes table to improve any flagged metric, then run a mesh convergence study.",
    ],
    faqs: [
      {
        question: "What is a good skewness value?",
        answer:
          "Lower is better: below 0.5 is very good, and the maximum should stay below about 0.95 for Fluent and about 0.9 for structural solids.",
      },
      {
        question: "Where do the limits come from?",
        answer:
          "Skewness and orthogonal quality bands follow the ANSYS Meshing User's Guide. Element quality, aspect ratio and Jacobian ratio bands are common rules of thumb and MAPDL shape-check defaults, so confirm limits for your element type and solver version.",
      },
      { question: "Is it free? Do I need to sign in?", answer: "Yes, it's free and needs no sign-in." },
    ],
  },
  {
    slug: "fea-consistent-units-chart",
    label: "Reference chart",
    title: "Consistent Units for FEA",
    lead: "Convert E, density, gravity, loads and energy into the right values for your solver's unit system — and catch unit mistakes.",
    seoTitle: "Consistent Units for FEA – Unit System Chart & Converter",
    seoDescription:
      "Free consistent unit systems chart for FEA: SI, mm-t-s, mm-kg-ms, mm-g-ms and inch-slinch. Convert E, density, gravity, loads and energy for your solver and catch unit mistakes.",
    summary: "SI, mm-t-s, mm-kg-ms and more — see exactly what to type in your solver and catch unit mistakes.",
    tags: ["FEA", "Units"],
    intro:
      "Most FEA solvers have no units — they trust you to be consistent. Enter your values once in everyday units and see exactly what to type for Young's modulus, density, force, pressure, gravity, velocity, time and energy in every common consistent unit system, with a check that flags E and density values that don't make sense together.",
    steps: [
      "Pick a material or enter E (GPa) and density (kg/m³), plus any loads you need.",
      "Read the converted values in the column for your solver's unit system (mm–t–s is the usual choice for ANSYS structural work).",
      "Use the unit mistake detector to check the E and density you actually typed into the solver.",
    ],
    faqs: [
      {
        question: "What density do I use for steel in a mm model?",
        answer: "In the mm–t–s system use 7.85e-9 t/mm³ together with E = 200 000 MPa and gravity = 9810 mm/s².",
      },
      {
        question: "How can I tell if my units are wrong?",
        answer:
          "Check the wave speed √(E/ρ): it is about 5 000 m/s for steel and aluminium. If your values give something far outside 1 000–12 000 m/s once converted back, a unit is wrong.",
      },
      { question: "Is it free? Do I need to sign in?", answer: "Yes, it's free and needs no sign-in." },
    ],
  },
];
