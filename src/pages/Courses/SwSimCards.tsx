import { Link } from "react-router-dom";
import { PlaceholderArt } from "@/components/ui/PlaceholderArt";
import { LISTING_CARDS, formatInr, currentPrice } from "@/content/swSimulation";
import "@/styles/drafting.css";

/** The three SOLIDWORKS Simulation cards (Level 1, Level 2, Combo) — from content, not the database. */
export function SwSimCards() {
  return (
    <>
      {LISTING_CARDS.map((card, i) => {
        const price = currentPrice(card.key);
        return (
          <Link key={card.key} to={card.to} className="course-card drafting-frame drafting-frame--interactive">
            <span className={`course-card__new${card.key === "level2" ? " course-card__new--muted" : ""}`}>{card.tag}</span>
            <PlaceholderArt label={`SOLIDWORKS-SIMULATION-${card.key === "combo" ? "L1+L2" : card.key.toUpperCase()}`} seed={i + 2} />
            <div className="course-card__body">
              <span className="mono-label">SolidWorks · FEA</span>
              <h3 className="course-card__title">{card.title}</h3>
              <p className="course-card__desc">{card.description}</p>
              <div className="course-card__footer">
                <span className="course-card__level">{price !== null ? `${formatInr(price)} + GST` : "Self-paced"}</span>
                <span className="course-card__cta">{card.button} →</span>
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
