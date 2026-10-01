import { Link } from "react-router-dom";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AREA_LINK_LABELS, AREA_PATHS, type AreaKey } from "@/content/localAreas";
import "./home.css";

const CITY_KEYS: AreaKey[] = ["delhi", "noida", "gurgaon", "ghaziabad"];

// Homepage entry point to the Delhi NCR landing pages (local SEO hub).
export function LocalTrainingSection() {
  return (
    <section className="section container local-home">
      <SectionHeading
        title="ANSYS Training in Delhi NCR — the hand-calc-first way"
        subtitle="Live ANSYS Workbench batches for students and working engineers across Delhi, Noida, Gurugram, Ghaziabad, Faridabad and Meerut, with classroom options in the NCR."
        align="center"
      />
      <div className="local-home__body">
        <p>
          Most FEA courses teach you where to click. We teach you what answer to expect: you estimate
          stress or deflection with the right formula first, then build the model in ANSYS Workbench and
          compare. When the numbers agree you can defend the result in a design review; when they don&apos;t,
          you learn exactly why — mesh, supports or assumptions.
        </p>
        <p>
          <Link to={AREA_PATHS["delhi-ncr"]} className="local-home__hub">
            Fees, next batch and FAQs for ANSYS training in Delhi NCR →
          </Link>
        </p>
        <ul className="local-home__cities">
          {CITY_KEYS.map((k) => (
            <li key={k}>
              <Link to={AREA_PATHS[k]}>{AREA_LINK_LABELS[k]}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
