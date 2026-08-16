import { Link } from "react-router-dom";
import { HeroSketch } from "./HeroSketch";
import "./home.css";

export function HeroSection() {
  return (
    <section className="hero">
      <div className="hero__grid-bg blueprint-grid" aria-hidden="true" />
      <div className="hero__inner">
        <div className="hero__copy">
          <span className="mono-label section-eyebrow">CADSEEKHO — ENGINEERING TRAINING</span>
          <h1 className="hero__headline">Learn CAD. Build Skills. Solve Real Engineering Problems.</h1>
          <p className="hero__subhead">
            Practical CAD and engineering training designed for students, engineers, designers, and
            working professionals.
          </p>
          <div className="hero__actions">
            <Link to="/courses" className="btn btn--primary">
              Explore Courses
            </Link>
            <Link to="/downloads" className="btn btn--outline">
              Free Downloads
            </Link>
          </div>
        </div>
        <div className="hero__visual">
          <HeroSketch />
        </div>
      </div>
    </section>
  );
}
