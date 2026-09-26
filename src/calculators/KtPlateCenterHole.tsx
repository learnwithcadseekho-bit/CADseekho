import { useMemo, useState } from "react";
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
  ktgCenterHole,
  ktnCenterHole,
  ligamentStress,
  solvePlateCenterHole,
  validatePlateCenterHole,
} from "./plateCenterHoleMath";
import type { ResourceComponentProps } from "./registry";
import "./calculator.css";

const RATIO_WARN = 0.75;

type Field = "W" | "d" | "t" | "P";

const FIELDS: { key: Field; label: string; symbol: string; unit: string }[] = [
  { key: "W", label: "Plate width", symbol: "W", unit: "mm" },
  { key: "d", label: "Hole diameter", symbol: "d", unit: "mm" },
  { key: "t", label: "Thickness", symbol: "t", unit: "mm" },
  { key: "P", label: "Axial load", symbol: "P", unit: "N" },
];

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

// Peterson's curves don't depend on the inputs — compute once.
const KT_XS = Array.from({ length: 61 }, (_, k) => (k * RATIO_WARN) / 60);
const KTN_CURVE = KT_XS.map((x) => ({ x, y: ktnCenterHole(x) }));
const KTG_CURVE = KT_XS.map((x) => ({ x, y: ktgCenterHole(x) }));

export default function KtPlateCenterHole({ resourceId, config, premium, onCalculate }: ResourceComponentProps) {
  const [values, setValues] = useState<Record<Field, string>>({ W: "100", d: "20", t: "10", P: "50000" });
  const mat = useMaterial();

  const input = { W: num(values.W), d: num(values.d), t: num(values.t), P: num(values.P), sy: mat.sy };
  const problems = validatePlateCenterHole(input);
  const result = problems.length === 0 ? solvePlateCenterHole(input) : null;
  const errorFor = (f: string) => problems.find((p) => p.field === f)?.message;

  const resultKey = result ? `${input.W}|${input.d}|${input.t}|${input.P}|${input.sy}` : "";
  useCalculateEvent(resultKey, onCalculate);

  const payload = premium as CalcPremium | null;
  const teaser = typeof config.validation_teaser === "string" ? config.validation_teaser : null;

  const texValues = useMemo(() => {
    if (!result) return null;
    return {
      W: texNum(input.W, 0),
      d: texNum(input.d, 0),
      t: texNum(input.t, 0),
      P: texNum(input.P, 0),
      Sy: texNum(input.sy, 0),
      ratio: texNum(result.ratio, 3),
      u: texNum(1 - result.ratio, 3),
      Ag: texNum(result.Ag, 0),
      An: texNum(result.An, 0),
      sigmaG: texNum(result.sigmaG),
      sigmaN: texNum(result.sigmaN),
      Ktn: texNum(result.Ktn, 3),
      Ktg: texNum(result.Ktg, 3),
      sigmaMax: texNum(result.sigmaMax),
      sigmaMaxCheck: texNum(result.Ktg * result.sigmaG),
      fos: texNum(result.fos),
      sigmaInf: texNum(result.sigmaInfinite),
      pct: `${result.finiteWidthPct >= 0 ? "+" : ""}${texNum(result.finiteWidthPct, 1)}`,
    };
    // resultKey captures every input the values depend on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey]);

  return (
    <div className="calc">
      <img
        src="/resources/sketches/plate-center-hole.webp"
        alt="Plate of width W with a central hole of diameter d, pulled by axial force F at both ends"
        className="calc__sketch"
        width={1200}
        height={376}
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
              {result.ratio > RATIO_WARN && (
                <p className="calc-warning" role="status">
                  d/W = {result.ratio.toFixed(3)} is above {RATIO_WARN} — outside the reliable range of Peterson's
                  chart. Treat the result as a rough estimate.
                </p>
              )}
              <dl className="calc-values">
                <ResultRow tex="d/W" value={result.ratio.toFixed(3)} />
                <ResultRow tex="K_{tn}" note="net" value={result.Ktn.toFixed(3)} />
                <ResultRow tex="K_{tg}" note="gross" value={result.Ktg.toFixed(3)} />
                <ResultRow tex="\sigma_n" note="net nominal" value={`${result.sigmaN.toFixed(2)} MPa`} />
                <ResultRow tex="\sigma_{max}" note="peak, at hole edge" value={`${result.sigmaMax.toFixed(2)} MPa`} main />
                <ResultRow
                  tex="\text{vs } 3\sigma_g"
                  note={`infinite plate, ${result.sigmaInfinite.toFixed(2)} MPa`}
                  value={`${result.finiteWidthPct >= 0 ? "+" : ""}${result.finiteWidthPct.toFixed(1)}%`}
                />
              </dl>
            </>
          )}
        </section>
      </div>

      <StepsSection resourceId={resourceId} premium={payload} values={texValues} />

      <ChartsSection
        resourceId={resourceId}
        premium={payload}
        ready={Boolean(result)}
        lockedText="Peterson's Kt curves with your design point marked, and how the stress falls away from the hole."
      >
        {result && (
          <>
            <LineChart
              title="Stress concentration factor vs d/W"
              description={`K_tn and K_tg against d/W from 0 to ${RATIO_WARN}, with your design point at d/W = ${result.ratio.toFixed(3)}.`}
              xLabel="d / W"
              yLabel="Kt"
              xDomain={[0, RATIO_WARN]}
              yDomain={[0, Math.max(8, result.Ktg * 1.1)]}
              series={[
                { label: "Ktn (net section)", color: "#1B2A4A", points: KTN_CURVE },
                { label: "Ktg (gross section)", color: "#B8461A", points: KTG_CURVE, dashed: true },
              ]}
              markers={
                result.ratio <= RATIO_WARN
                  ? [
                      { x: result.ratio, y: result.Ktn, label: `Ktn ${result.Ktn.toFixed(3)}` },
                      { x: result.ratio, y: result.Ktg, label: `Ktg ${result.Ktg.toFixed(3)}` },
                    ]
                  : []
              }
            />
            <LineChart
              title="Stress along the ligament (hole edge → plate edge)"
              description={`Approximate stress from ${result.sigmaMax.toFixed(0)} MPa at the hole edge falling toward the plate edge.`}
              xLabel="Distance from hole centre x (mm)"
              yLabel="σ (MPa)"
              series={[
                {
                  label: "σ(x) — approximate, Kirsch shape, best for d/W ≤ 0.3",
                  color: "#1B2A4A",
                  points: ligamentStress(input).map((p) => ({ x: p.x, y: p.sigma })),
                },
                {
                  label: "σn (net nominal)",
                  color: "#75849C",
                  dashed: true,
                  points: [
                    { x: input.d / 2, y: result.sigmaN },
                    { x: input.W / 2, y: result.sigmaN },
                  ],
                },
              ]}
              markers={[{ x: input.d / 2, y: result.sigmaMax, label: `σmax ${result.sigmaMax.toFixed(1)} MPa` }]}
            />
          </>
        )}
      </ChartsSection>

      <ValidationSection resourceId={resourceId} premium={payload} teaser={teaser} />
      <CalcFooter />
    </div>
  );
}
