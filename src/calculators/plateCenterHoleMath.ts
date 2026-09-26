// Plate of finite width with a central circular hole, axial tension.
// Pilkey & Pilkey, Peterson's Stress Concentration Factors, 3rd ed.,
// Eq. 4.1 / Chart 4.1. Units: mm, N, MPa.

export interface PlateCenterHoleInput {
  /** Plate width W, mm */
  W: number;
  /** Hole diameter d, mm */
  d: number;
  /** Thickness t, mm */
  t: number;
  /** Axial load P, N */
  P: number;
  /** Yield strength, MPa */
  sy: number;
}

export interface PlateCenterHoleResult {
  ratio: number;
  Ag: number;
  An: number;
  sigmaG: number;
  sigmaN: number;
  Ktn: number;
  Ktg: number;
  sigmaMax: number;
  fos: number;
  /** 3·σ_g — the infinite-plate peak */
  sigmaInfinite: number;
  /** (σ_max − 3σ_g) / 3σ_g, as a percentage */
  finiteWidthPct: number;
}

/** K_tn as a function of d/W (Peterson Eq. 4.1). */
export function ktnCenterHole(ratio: number): number {
  const u = 1 - ratio;
  return 2 + 0.284 * u - 0.6 * u ** 2 + 1.32 * u ** 3;
}

export function ktgCenterHole(ratio: number): number {
  return ktnCenterHole(ratio) / (1 - ratio);
}

export type InputProblem = { field: keyof PlateCenterHoleInput; message: string };

export function validatePlateCenterHole(i: PlateCenterHoleInput): InputProblem[] {
  const problems: InputProblem[] = [];
  const positive: [keyof PlateCenterHoleInput, string][] = [
    ["W", "Plate width"],
    ["d", "Hole diameter"],
    ["t", "Thickness"],
    ["P", "Load"],
    ["sy", "Yield strength"],
  ];
  for (const [field, label] of positive) {
    if (!Number.isFinite(i[field]) || i[field] <= 0) problems.push({ field, message: `${label} must be a positive number.` });
  }
  if (problems.length === 0 && i.d >= i.W) {
    problems.push({ field: "d", message: "The hole must be smaller than the plate width (d < W)." });
  }
  return problems;
}

export function solvePlateCenterHole(i: PlateCenterHoleInput): PlateCenterHoleResult {
  const ratio = i.d / i.W;
  const Ag = i.W * i.t;
  const An = (i.W - i.d) * i.t;
  const sigmaG = i.P / Ag;
  const sigmaN = i.P / An;
  const Ktn = ktnCenterHole(ratio);
  const Ktg = Ktn / (1 - ratio);
  const sigmaMax = Ktn * sigmaN;
  const sigmaInfinite = 3 * sigmaG;
  return {
    ratio,
    Ag,
    An,
    sigmaG,
    sigmaN,
    Ktn,
    Ktg,
    sigmaMax,
    fos: i.sy / sigmaMax,
    sigmaInfinite,
    finiteWidthPct: ((sigmaMax - sigmaInfinite) / sigmaInfinite) * 100,
  };
}

/**
 * Approximate σ_y along the ligament, from the hole edge (x = r) to the plate
 * edge (x = W/2): the Kirsch infinite-plate shape, scaled so the value at
 * the hole edge equals σ_max. Best for d/W ≤ 0.3.
 */
export function ligamentStress(i: PlateCenterHoleInput, points = 16): { x: number; sigma: number }[] {
  const r = i.d / 2;
  const { sigmaG, sigmaMax } = solvePlateCenterHole(i);
  const scale = sigmaMax / (3 * sigmaG);
  return Array.from({ length: points }, (_, k) => {
    const x = r + ((i.W / 2 - r) * k) / (points - 1);
    const q = r / x;
    return { x, sigma: scale * sigmaG * (1 + 0.5 * q ** 2 + 1.5 * q ** 4) };
  });
}
