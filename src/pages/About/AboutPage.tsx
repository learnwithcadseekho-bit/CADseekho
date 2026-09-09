import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import "@/styles/cards.css";
import "./about.css";

export default function AboutPage() {
  return (
    <>
      <section className="section container about-page">
        <Seo
          title="About CADseekho"
          description="CADseekho is an engineering education platform teaching CAD design and CAE simulation — SolidWorks, Creo, ANSYS, HyperMesh — with a solve-by-hand-first methodology, online and offline."
        />
        <SectionHeading
          title="Engineering education, not just software tutorials"
          as="h1"
        />

        <div className="about-block">
          <h2>What is CADseekho?</h2>
          <p>
            CADseekho is an engineering education platform built for students, engineers, and
            working professionals who want to go beyond software tutorials and actually understand
            the engineering behind their designs. Every course follows our core methodology: solve
            by hand first, validate in software — so you build real engineering judgment, not just
            click-familiarity.
          </p>
          <p>
            We train across the full CAD-to-CAE spectrum, covering both design and simulation,
            available online and offline.
          </p>
        </div>

        <div className="about-block">
          <h2>What we teach</h2>
          <div className="about-teach-grid">
            <div className="about-teach-col">
              <h3>CAD Design</h3>
              <ul>
                <li>SolidWorks — part modeling, assemblies, surfacing</li>
                <li>Creo — parametric modeling and design</li>
              </ul>
            </div>
            <div className="about-teach-col">
              <h3>CAE / Simulation</h3>
              <ul>
                <li>ANSYS — structural, thermal, and stress analysis</li>
                <li>HyperMesh — pre-processing and mesh generation</li>
                <li>SolidWorks Simulation — integrated FEA within SolidWorks</li>
                <li>Creo Simulation — integrated FEA within Creo</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="about-block">
          <h2>Learn your way</h2>
          <ul className="about-learn-list">
            <li>
              <strong>Online</strong> — live instructor-led or self-paced
            </li>
            <li>
              <strong>Offline</strong> — in-person, batch-based training
            </li>
          </ul>
        </div>

        <div className="about-block">
          <h2>Our approach</h2>
          <p>
            We don't just teach software — we teach engineering. Every simulation course is
            grounded in hand-calculation validation, so you leave able to defend your results in a
            design review, not just reproduce a tutorial.
          </p>
        </div>

        <div className="about-cta">
          <p style={{ marginBottom: "var(--space-4)" }}>Ready to start learning?</p>
          <Link to="/courses" className="btn btn--primary">
            Explore Courses
          </Link>
        </div>
      </section>
    </>
  );
}
