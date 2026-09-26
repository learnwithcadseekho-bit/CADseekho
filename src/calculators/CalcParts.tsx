// Building blocks shared by the calculator components.
import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LockedPanel } from "@/components/LockedPanel";
import { Tex } from "./Tex";
import { fillTemplate } from "./texFormat";
import { MATERIALS, VERDICT_LABELS, verdictFor } from "./materials";
import { CUSTOM_MATERIAL, type useMaterial } from "./calcHooks";

export function NumberField({
  label,
  symbol,
  unit,
  value,
  onChange,
  error,
}: {
  label: string;
  symbol: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="calc-field">
      <label htmlFor={id} className="calc-field__label">
        {label} <Tex tex={symbol} />
      </label>
      <div className="calc-field__control">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <span className="calc-field__unit">{unit}</span>
      </div>
      {error && (
        <p id={`${id}-err`} className="calc-field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export function MaterialPicker({ state, syError }: { state: ReturnType<typeof useMaterial>; syError?: string }) {
  const id = useId();
  const { key, setKey, material, customSy, setCustomSy } = state;
  return (
    <div className="calc-field">
      <label htmlFor={id} className="calc-field__label">
        Material
      </label>
      <select id={id} value={key} onChange={(e) => setKey(e.target.value)}>
        {MATERIALS.map((m) => (
          <option key={m.key} value={m.key}>
            {m.name} — Sy {m.sy} MPa
          </option>
        ))}
        <option value={CUSTOM_MATERIAL}>Custom…</option>
      </select>
      {material ? (
        <p className="calc-field__hint">
          Sy {material.sy} MPa · Sut {material.sut} MPa · E {material.e} GPa — typical values, verify against the
          datasheet.
        </p>
      ) : (
        <div style={{ marginTop: "var(--space-3)" }}>
          <NumberField label="Yield strength" symbol="S_y" unit="MPa" value={customSy} onChange={setCustomSy} error={syError} />
        </div>
      )}
    </div>
  );
}

export function VerdictBox({ fos }: { fos: number }) {
  const verdict = verdictFor(fos);
  return (
    <div className={`calc-verdict calc-verdict--${verdict}`}>
      <span className="calc-verdict__label">{VERDICT_LABELS[verdict]}</span>
      <span className="calc-verdict__fos">
        FoS = <strong>{fos.toFixed(2)}</strong>
      </span>
    </div>
  );
}

export function ResultRow({ tex, note, value, main }: { tex: string; note?: string; value: string; main?: boolean }) {
  return (
    <div className={main ? "calc-values__main" : undefined}>
      <dt>
        <Tex tex={tex} /> {note && <span>({note})</span>}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

/** resource_premium.payload shape shared by the Kt calculators. */
export interface CalcPremium {
  steps?: { title: string; tex: string[] }[];
  validation?: string[];
  charts?: boolean;
}

export function StepsSection({
  resourceId,
  premium,
  values,
}: {
  resourceId: string;
  premium: CalcPremium | null;
  /** Live values for the {{placeholders}}; null while inputs are invalid. */
  values: Record<string, string> | null;
}) {
  return (
    <section className="calc__section">
      <h3 className="calc__section-title">Step-by-step hand calculation</h3>
      {premium?.steps ? (
        values ? (
          <ol className="calc-steps">
            {premium.steps.map((s, i) => (
              <li key={i}>
                <h4>{s.title}</h4>
                {s.tex.map((line, j) => (
                  <Tex key={j} tex={fillTemplate(line, values)} block />
                ))}
              </li>
            ))}
          </ol>
        ) : (
          <p className="calc__placeholder">Fix the inputs above to see the working.</p>
        )
      ) : (
        <LockedPanel resourceId={resourceId} title="Full working with your numbers">
          Every step to the factor of safety, written out with your own inputs — the way you'd write it in an exam.
        </LockedPanel>
      )}
    </section>
  );
}

export function ChartsSection({
  resourceId,
  premium,
  ready,
  lockedText,
  children,
}: {
  resourceId: string;
  premium: CalcPremium | null;
  ready: boolean;
  lockedText: string;
  children: ReactNode;
}) {
  return (
    <section className="calc__section">
      <h3 className="calc__section-title">Charts</h3>
      {premium?.charts ? (
        ready ? (
          <div className="calc-charts">{children}</div>
        ) : (
          <p className="calc__placeholder">Fix the inputs above to see the charts.</p>
        )
      ) : (
        <LockedPanel resourceId={resourceId} title="Kt chart with your design point" preview="/resources/locked-chart-preview.svg">
          {lockedText}
        </LockedPanel>
      )}
    </section>
  );
}

export function ValidationSection({
  resourceId,
  premium,
  teaser,
}: {
  resourceId: string;
  premium: CalcPremium | null;
  teaser: string | null;
}) {
  return (
    <section className="calc__section">
      <h3 className="calc__section-title">Validate it in ANSYS / SolidWorks Simulation</h3>
      {premium?.validation ? (
        <ol className="calc-guide">
          {premium.validation.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      ) : (
        <>
          {teaser && (
            <ol className="calc-guide">
              <li>{teaser}</li>
            </ol>
          )}
          <LockedPanel resourceId={resourceId} title="The full validation guide">
            Model setup, mesh refinement, where to probe, and how close your FEA result should land.
          </LockedPanel>
        </>
      )}
    </section>
  );
}

export function CalcFooter() {
  return (
    <footer className="calc__footer">
      <p>Source: Pilkey &amp; Pilkey, Peterson's Stress Concentration Factors, 3rd ed.</p>
      <p>For learning purposes — verify critical designs with applicable codes.</p>
      <p>
        <Link to="/courses">Learn FEA and design properly with CADseekho courses →</Link>
      </p>
    </footer>
  );
}
