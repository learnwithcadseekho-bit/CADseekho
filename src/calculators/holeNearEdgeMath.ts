// Circular hole near the edge of a semi-infinite plate in tension.
// Pilkey & Pilkey, Peterson's Stress Concentration Factors, 3rd ed.,
// Chart 4.2 (Mindlin 1948; Udoguti 1947; Isida 1955a). Units: mm, N, MPa.
//
// Points (see the sketch): A = free edge, B = hole edge nearest the free
// edge (usually critical), C = hole edge on the far side.

export interface HoleNearEdgeInput {
  /** Hole radius a, mm */
  a: number;
  /** Distance from hole centre to the free edge c, mm */
  c: number;
  /** Thickness h, mm */
  h: number;
  /** Remote tensile stress σ, MPa */
  sigma: number;
  /** Yield strength, MPa */
  sy: number;
}

export interface HoleNearEdgeResult {
  x: number;
  KtgA: number;
  KtgB: number;
  KtgC: number;
  sigmaA: number;
  sigmaB: number;
  sigmaC: number;
  sigmaNet: number;
  Ktn: number;
  ligamentLoad: number;
  sigmaMax: number;
  /** Which hole point carries σ_max */
  critical: "B" | "C";
  fos: number;
  /** 3σ — an isolated hole far from any edge */
  sigmaIsolated: number;
  /** (σ_max − 3σ) / 3σ, as a percentage */
  edgePenaltyPct: number;
}

export const X_CHART_MAX = 0.85;

export function ktgA(x: number): number {
  return 0.99619 - 0.43879 * x - 0.0613028 * x ** 2 - 0.48941 * x ** 3;
}

export function ktgB(x: number): number {
  return 3.0004 + 0.083503 * x + 7.3417 * x ** 2 - 38.046 * x ** 3 + 106.037 * x ** 4 - 130.133 * x ** 5 + 65.065 * x ** 6;
}

export function ktgC(x: number): number {
  return 2.9943 + 0.54971 * x - 2.32876 * x ** 2 + 8.9718 * x ** 3 - 13.344 * x ** 4 + 7.1452 * x ** 5;
}

/** σ_net / σ on ligament A–B. */
export function netFactor(x: number): number {
  return Math.sqrt(1 - x ** 2) / (1 - x);
}

export function ktnHoleNearEdge(x: number): number {
  return ktgB(x) / netFactor(x);
}

export type InputProblem = { field: keyof HoleNearEdgeInput; message: string };

export function validateHoleNearEdge(i: HoleNearEdgeInput): InputProblem[] {
  const problems: InputProblem[] = [];
  const positive: [keyof HoleNearEdgeInput, string][] = [
    ["a", "Hole radius"],
    ["c", "Edge distance"],
    ["h", "Thickness"],
    ["sigma", "Remote stress"],
    ["sy", "Yield strength"],
  ];
  for (const [field, label] of positive) {
    if (!Number.isFinite(i[field]) || i[field] <= 0) problems.push({ field, message: `${label} must be a positive number.` });
  }
  if (problems.length === 0 && i.a >= i.c) {
    problems.push({ field: "c", message: "The hole must not reach the edge: c has to be larger than a." });
  }
  return problems;
}

export function solveHoleNearEdge(i: HoleNearEdgeInput): HoleNearEdgeResult {
  const x = i.a / i.c;
  const KtgA = ktgA(x);
  const KtgB = ktgB(x);
  const KtgC = ktgC(x);
  const sigmaA = KtgA * i.sigma;
  const sigmaB = KtgB * i.sigma;
  const sigmaC = KtgC * i.sigma;
  const sigmaNet = i.sigma * netFactor(x);
  const sigmaMax = Math.max(sigmaB, sigmaC);
  const sigmaIsolated = 3 * i.sigma;
  return {
    x,
    KtgA,
    KtgB,
    KtgC,
    sigmaA,
    sigmaB,
    sigmaC,
    sigmaNet,
    Ktn: sigmaB / sigmaNet,
    ligamentLoad: i.sigma * i.h * i.c * Math.sqrt(1 - x ** 2),
    sigmaMax,
    critical: sigmaB >= sigmaC ? "B" : "C",
    fos: i.sy / sigmaMax,
    sigmaIsolated,
    edgePenaltyPct: ((sigmaMax - sigmaIsolated) / sigmaIsolated) * 100,
  };
}
