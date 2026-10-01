import { Link } from "react-router-dom";
import { SectionHeading } from "@/components/ui/SectionHeading";
import "./home.css";

// How the simulation courses are taught, with links into the ANSYS course and
// the free hand-calculation tools.
export function MethodSection() {
  return (
    <section className="section container method-home">
      <SectionHeading
        title="Live online ANSYS training — the hand-calc-first way"
        subtitle="Instructor-led ANSYS Workbench classes you join from anywhere, for students and working engineers."
        align="center"
      />
      <div className="method-home__body">
        <p>
          Most FEA courses teach you where to click. We teach you what answer to expect: you estimate
          stress or deflection with the right formula first, then build the model in ANSYS Workbench and
          compare. When the numbers agree you can defend the result in a design review; when they don&apos;t,
          you learn exactly why — mesh, supports or assumptions.
        </p>
        <ul className="method-home__links">
          <li>
            <Link to="/courses/ansys-workbench-level-1">ANSYS Workbench course — syllabus, fees &amp; next batch</Link>
          </li>
          <li>
            <Link to="/tools/beam-calculator">Free beam calculator</Link>
          </li>
          <li>
            <Link to="/resources/plate-with-hole-stress-concentration-calculator">Free stress-concentration (Kt) calculator</Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
