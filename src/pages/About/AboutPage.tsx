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
          description="CADseekho is an online engineering education platform focused on CAD, 3D modeling, engineering design, simulation, and PLM."
        />
        <SectionHeading
          title="Practical CAD training, built for engineers"
          as="h1"
        />

        <div className="about-block">
          <h2>What is CADseekho?</h2>
          <p>
            CADseekho is an online engineering education platform focused on CAD, 3D modeling,
            engineering design, simulation, manufacturing, and PLM. We build focused, practical
            courses around the software and workflows engineers actually use on the job.
          </p>
        </div>

        <div className="about-block">
          <h2>Who is it for?</h2>
          <p>
            CADseekho is built for engineering students, mechanical and civil engineers, designers,
            working professionals, teachers, and anyone learning CAD — whether you're starting from
            zero or sharpening skills for a specific workflow like sheet metal or weldments.
          </p>
        </div>

        <div className="about-block">
          <h2>Our training philosophy</h2>
          <p>
            We focus on practical, scenario-based learning rather than just walking through software
            menus. Courses are structured from fundamentals to advanced concepts, and built around
            real engineering problems — the kind you'll actually run into in design, drafting, and
            manufacturing work.
          </p>
        </div>

        <div className="about-block">
          <h2>CAD & engineering focus</h2>
          <p>
            Our course catalog spans AutoCAD, SolidWorks, simulation (ANSYS), and mechanism design
            (Creo) — covering the tools used across mechanical, civil, and design disciplines.
          </p>
        </div>

        <div className="about-block">
          <h2>Company details</h2>
          <p className="about-placeholder">
            Additional company information will be added here as it becomes available.
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
