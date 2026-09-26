export interface Material {
  key: string;
  name: string;
  /** Yield strength, MPa */
  sy: number;
  /** Ultimate tensile strength, MPa */
  sut: number;
  /** Young's modulus, GPa */
  e: number;
}

// Typical values — the UI labels them "verify against datasheet".
export const MATERIALS: Material[] = [
  { key: "structural-steel", name: "Structural Steel (ANSYS default)", sy: 250, sut: 460, e: 200 },
  { key: "is2062-e250", name: "Mild Steel IS 2062 E250", sy: 250, sut: 410, e: 200 },
  { key: "aisi-1020-cd", name: "AISI 1020 (cold drawn)", sy: 350, sut: 420, e: 205 },
  { key: "aisi-4140-qt", name: "AISI 4140 (Q&T)", sy: 655, sut: 1020, e: 205 },
  { key: "ss-304", name: "Stainless Steel 304 (annealed)", sy: 215, sut: 505, e: 193 },
  { key: "al-6061-t6", name: "Aluminium 6061-T6", sy: 276, sut: 310, e: 68.9 },
  { key: "al-7075-t6", name: "Aluminium 7075-T6", sy: 503, sut: 572, e: 71.7 },
  { key: "ti-6al-4v", name: "Titanium Ti-6Al-4V (annealed)", sy: 880, sut: 950, e: 113.8 },
];

export type Verdict = "safe" | "marginal" | "yields";

export function verdictFor(fos: number): Verdict {
  if (fos >= 1.5) return "safe";
  if (fos >= 1) return "marginal";
  return "yields";
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  safe: "SAFE — elastic",
  marginal: "MARGINAL",
  yields: "YIELDS locally",
};
