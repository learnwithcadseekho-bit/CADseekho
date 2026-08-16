import { SectionHeading } from "@/components/ui/SectionHeading";
import "./home.css";

const REASONS = [
  {
    title: "Practical Learning",
    body: "Focus on real engineering applications rather than only software commands.",
  },
  {
    title: "Industry-Oriented Skills",
    body: "Learn workflows and techniques useful in professional engineering environments.",
  },
  {
    title: "Scenario-Based Problems",
    body: "Include practical engineering problems and exercises.",
  },
  {
    title: "Structured Learning",
    body: "Courses are organized from fundamentals to advanced concepts.",
  },
  {
    title: "Engineering Focus",
    body: "Training is designed around real CAD, design, manufacturing, and simulation workflows.",
  },
];

export function WhySection() {
  return (
    <section className="section container">
      <SectionHeading
        number="03"
        eyebrow="WHY CADSEEKHO"
        title="Why Learn With CADseekho?"
        align="center"
      />
      <div className="why-grid">
        {REASONS.map((reason) => (
          <div className="why-card" key={reason.title}>
            <h3 className="why-card__title">{reason.title}</h3>
            <p className="why-card__body">{reason.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
