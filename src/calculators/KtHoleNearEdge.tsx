import { useMemo, useState } from "react";
import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import { texNum } from "./texFormat";
import {
  CalcFooter,
  ChartsSection,
  MaterialPicker,
  NumberField,
  ResultRow,
  StepsSection,
  ValidationSection,
  VerdictBox,
  type CalcPremium,
} from "./CalcParts";
import { useCalculateEvent, useMaterial } from "./calcHooks";
import {
  X_CHART_MAX,
  ktgA,
  ktgB,
  ktgC,
  ktnHoleNearEdge,
  solveHoleNearEdge,
  validateHoleNearEdge,
} from "./holeNearEdgeMath";
import type { ResourceComponentProps } from "./registry";
import "./calculator.css";

type Field = "a" | "c" | "h" | "sigma";

const FIELDS: { key: Field; label: string; symbol: string; unit: string }[] = [
  { key: "a", label: "Hole radius", symbol: "a", unit: "mm" },
  { key: "c", label: "Hole centre to free edge", symbol: "c", unit: "mm" },
  { key: "h", label: "Thickness", symbol: "h", unit: "mm" },
  { key: "sigma", label: "Remote stress", symbol: "\\sigma", unit: "MPa" },
];

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

// Peterson's Chart 4.2 curves — independent of the inputs.
const XS = Array.from({ length: 69 }, (_, k) => (k * X_CHART_MAX) / 68);
const CURVES = {
  A: XS.map((x) => ({ x, y: ktgA(x) })),
  B: XS.map((x) => ({ x, y: ktgB(x) })),
  C: XS.map((x) => ({ x, y: ktgC(x) })),
  n: XS.map((x) => ({ x, y: ktnHoleNearEdge(x) })),
};

export default function KtHoleNearEdge({ resourceId, config, premium, onCalculate }: ResourceComponentProps) {
  const [values, setValues] = useState<Record<Field, string>>({ a: "10", c: "20", h: "5", sigma: "50" });
  const mat = useMaterial();

  const input = { a: num(values.a), c: num(values.c), h: num(values.h), sigma: num(values.sigma), sy: mat.sy };
  const problems = validateHoleNearEdge(input);
  const result = problems.length === 0 ? solveHoleNearEdge(input) : null;
  const errorFor = (f: string) => problems.find((p) => p.field === f)?.message;

  const resultKey = result ? `${input.a}|${input.c}|${input.h}|${input.sigma}|${input.sy}` : "";
  useCalculateEvent(resultKey, onCalculate);

  const payload = premium as CalcPremium | null;
  const teaser = typeof config.validation_teaser === "string" ? config.validation_teaser : null;

  const texValues = useMemo(() => {
    if (!result) return null;
    return {
      a: texNum(input.a, 0),
      c: texNum(input.c, 0),
      h: texNum(input.h, 0),
      sigma: texNum(input.sigma),
      Sy: texNum(input.sy, 0),
      x: texNum(result.x, 3),
      KtgA: texNum(result.KtgA, 3),
      KtgB: texNum(result.KtgB, 3),
      KtgC: texNum(result.KtgC, 3),
      sigmaA: texNum(result.sigmaA),
      sigmaB: texNum(result.sigmaB),
      sigmaC: texNum(result.sigmaC),
      sigmaNet: texNum(result.sigmaNet),
      Ktn: texNum(result.Ktn, 3),
      load: texNum(result.ligamentLoad, 0),
      sigmaMax: texNum(result.sigmaMax),
      crit: result.critical,
      fos: texNum(result.fos),
      sigmaIso: texNum(result.sigmaIsolated),
      pct: `${result.edgePenaltyPct >= 0 ? "+" : ""}${texNum(result.edgePenaltyPct, 1)}`,
    };
    // resultKey captures every input the values depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey]);

  const tooClose = result && input.c < 2 * input.a;

  return (
    <div className="calc">
      <img
        src="/resources/sketches/plate-hole-near-edge.webp"
        alt="Semi-infinite plate in tension σ with a hole of radius a whose centre is distance c from the free edge; point A on the free edge, B on the hole edge nearest the free edge, C on the far side of the hole; thickness h"
        className="calc__sketch"
        width={1200}
        height={430}
      />

      <div className="calc__layout">
        <fieldset className="calc__inputs">
          <legend className="calc__legend">Inputs</legend>
          {FIELDS.map((f) => (
            <NumberField
              key={f.key}
              label={f.label}
              symbol={f.symbol}
              unit={f.unit}
              value={values[f.key]}
              onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
              error={errorFor(f.key)}
            />
          ))}
          <MaterialPicker state={mat} syError={errorFor("sy")} />
        </fieldset>

        <section className="calc__results" aria-live="polite" aria-label="Results">
          <h3 className="calc__legend">Results</h3>
          {!result ? (
            <p className="calc__placeholder">Fix the highlighted inputs to see results.</p>
          ) : (
            <>
              <VerdictBox fos={result.fos} />
              {result.x > X_CHART_MAX && (
                <p className="calc-warning" role="status">
                  a/c = {result.x.toFixed(3)} is past {X_CHART_MAX}, beyond the range of Peterson's chart. Treat the
                  result as a rough estimate.
                </p>
              )}
              <dl className="calc-values">
                <ResultRow tex="a/c" value={result.x.toFixed(3)} />
                <ResultRow tex="K_{tgA}" note="free edge" value={result.KtgA.toFixed(3)} />
                <ResultRow tex="K_{tgB}" note="hole, near edge" value={result.KtgB.toFixed(3)} />
                <ResultRow tex="K_{tgC}" note="hole, far side" value={result.KtgC.toFixed(3)} />
                <ResultRow tex="K_{tn}" note="on ligament A–B" value={result.Ktn.toFixed(3)} />
                <ResultRow
                  tex="\sigma_{max}"
                  note={`peak, at ${result.critical}`}
                  value={`${result.sigmaMax.toFixed(2)} MPa`}
                  main
                />
                <ResultRow
                  tex="\text{vs } 3\sigma"
                  note={`isolated hole, ${result.sigmaIsolated.toFixed(2)} MPa`}
                  value={`${result.edgePenaltyPct >= 0 ? "+" : ""}${result.edgePenaltyPct.toFixed(1)}%`}
                />
              </dl>
              <p className={tooClose ? "calc-warning" : "calc-field__hint"} style={{ marginTop: "var(--space-3)", marginBottom: 0 }}>
                Design tip: keep c at least 2a to 3a
                {tooClose ? ` — here c = ${(input.c / input.a).toFixed(2)}a, so the edge is pushing the stress up.` : "."}
              </p>
            </>
          )}
        </section>
      </div>

      <StepsSection resourceId={resourceId} premium={payload} values={texValues} />

      <ChartsSection
        resourceId={resourceId}
        premium={payload}
        ready={Boolean(result)}
        lockedText="Kt at A, B and C against a/c with your design point marked, and a side-by-side of the stresses at A, B and C."
      >
        {result && (
          <>
            <LineChart
              title="Stress concentration factors vs a/c"
              description={`K_tgA, K_tgB, K_tgC and K_tn against a/c from 0 to ${X_CHART_MAX}, with your design point at a/c = ${result.x.toFixed(3)}.`}
              xLabel="a / c"
              yLabel="Kt"
              xDomain={[0, X_CHART_MAX]}
              yDomain={[0, Math.max(6, result.KtgB * 1.1)]}
              series={[
                { label: "KtgB (hole, near edge)", color: "#B8461A", points: CURVES.B },
                { label: "KtgC (hole, far side)", color: "#1B2A4A", points: CURVES.C },
                { label: "Ktn (net, ligament A–B)", color: "#46566B", points: CURVES.n, dashed: true },
                { label: "KtgA (free edge)", color: "#75849C", points: CURVES.A, dashed: true },
              ]}
              markers={
                result.x <= X_CHART_MAX ? [{ x: result.x, y: result.KtgB, label: `KtgB ${result.KtgB.toFixed(3)}` }] : []
              }
            />
            <BarChart
              title="Stress at A, B and C"
              description={`Stress at A ${result.sigmaA.toFixed(1)}, B ${result.sigmaB.toFixed(1)}, C ${result.sigmaC.toFixed(1)} MPa, compared with an isolated hole at ${result.sigmaIsolated.toFixed(1)} MPa and the yield strength ${input.sy} MPa.`}
              unit="MPa"
              bars={[
                { label: "A — free edge", value: result.sigmaA, color: "#75849C" },
                { label: "B — near edge", value: result.sigmaB, color: result.critical === "B" ? "#B8461A" : "#1B2A4A" },
                { label: "C — far side", value: result.sigmaC, color: result.critical === "C" ? "#B8461A" : "#1B2A4A" },
              ]}
              references={[
                { label: `3σ ${result.sigmaIsolated.toFixed(0)}`, value: result.sigmaIsolated, color: "#46566B" },
                { label: `Sy ${input.sy}`, value: input.sy, color: "#C8372B" },
              ]}
            />
          </>
        )}
      </ChartsSection>

      <ValidationSection resourceId={resourceId} premium={payload} teaser={teaser} />
      <CalcFooter />
    </div>
  );
}
