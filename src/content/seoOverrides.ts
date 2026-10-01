// Hand-written titles/descriptions for pages whose database title doesn't
// make a good search snippet (too long, or missing the local/keyword angle).
// Keyed by slug. Titles ≤ 60 chars including the brand; descriptions ≤ 155.
// Anything not listed falls back to an automatic title from the DB data.

export const COURSE_SEO: Record<string, { title?: string; description?: string }> = {
  "ansys-workbench-level-1": {
    title: "ANSYS Workbench Course for Beginners – Delhi NCR | CADseekho",
    description:
      "Beginner ANSYS Workbench course, live online for Delhi NCR & India: meshing, static structural, thermal, buckling — validated with hand calculations.",
  },
  "solidworks-simulation-for-beginners": {
    title: "SOLIDWORKS Simulation Course (FEA) – Live Online | CADseekho",
    description:
      "Live SOLIDWORKS Simulation course: set up FEA studies inside SolidWorks, apply loads and fixtures, mesh, and interpret results like an engineer.",
  },
};

export const POST_SEO: Record<string, { title?: string; description?: string }> = {
  "deep-hole-drilling-design-guide": {
    title: "Deep Hole Drilling: Design Rules & Aspect Ratio | CADseekho",
  },
  "minimum-hole-diameter-design-guide": {
    title: "Minimum Hole Diameter in Design: Practical Guide | CADseekho",
  },
};

const BRAND = " | CADseekho";

/** Fits a title into 60 chars: "<title> | CADseekho" if it fits, else the title alone, else truncated. */
export function fitTitle(title: string, max = 60): string {
  if (title.length + BRAND.length <= max) return `${title}${BRAND}`;
  if (title.length <= max) return title;
  const cut = title.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,:;–—-]+$/, "")}…`;
}
