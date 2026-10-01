import { Link } from "react-router-dom";
import { CoursePromoCard } from "./CoursePromoCard";
import "./home.css";

export function HeroSection() {
  return (
    <section className="hero">
      <div className="hero__grid-bg blueprint-grid" aria-hidden="true" />
      <div className="hero__inner">
        <div className="hero__copy">
          <span className="mono-label section-eyebrow">CADSEEKHO — ENGINEERING TRAINING · LIVE ONLINE</span>
          <h1 className="hero__headline">Online ANSYS &amp; FEA Training</h1>
          <p className="hero__subhead">
            Solve it by hand first, then validate it in ANSYS Workbench. Practical simulation and CAD
            training — SolidWorks, Creo and AutoCAD too — for students, engineers and working
            professionals.
          </p>
          <div className="hero__actions">
            <Link to="/courses" className="btn btn--primary">
              Explore Courses
            </Link>
            <Link to="/resources" className="btn btn--outline">
              Free Resources
            </Link>
          </div>
        </div>
        <div className="hero__visual">
          <CoursePromoCard />
        </div>
      </div>
    </section>
  );
}
