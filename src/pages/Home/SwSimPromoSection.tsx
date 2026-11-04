import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { trackCustom } from "@/lib/track";
import { COMBO, LEVEL1_MODULES, SIGNUP_INTENT, SIGNUP_INTENT_KEY, SW_SIM, offerNote, priceLine, totalHours } from "@/content/swSimulation";
import "./home.css";

const FIRST_LESSON = "M1.1";
const TAGS = ["Static studies", "Mesh convergence", "Failure criteria", "Hand calc vs FEA", "Validation reports"];
const INCLUDED = ["Pre-recorded lessons", "SOLIDWORKS part files", "Problems with answers", "Validation sheet template"];

/**
 * Homepage feature for SOLIDWORKS Simulation Level 1 — the same promo card
 * as the ANSYS course in the hero (CoursePromoCard), with its pitch beside it.
 * All facts come from content/swSimulation.ts and the pricing config.
 */
export function SwSimPromoSection() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const lessonPath = `${SW_SIM.classroomPath}/${FIRST_LESSON}`;
  const price = priceLine("level1");
  const comboPrice = priceLine("combo");
  const offer = offerNote("level1");

  function startFree(e: MouseEvent<HTMLAnchorElement>) {
    trackCustom("sw_sim_lesson_start", { lesson_code: FIRST_LESSON, signed_in: Boolean(session), from: "home" });
    if (session) return;
    e.preventDefault();
    try {
      sessionStorage.setItem(SIGNUP_INTENT_KEY, SIGNUP_INTENT);
    } catch {
      // storage blocked
    }
    navigate("/signup", { state: { from: { pathname: lessonPath } } });
  }

  return (
    <section className="sws-home" aria-labelledby="sws-home-title">
      <div className="hero__inner sws-home__inner">
        <div className="hero__copy">
          <span className="mono-label section-eyebrow">New · Self-paced · Modules 0–1 free</span>
          <h2 className="hero__headline sws-home__title" id="sws-home-title">
            SOLIDWORKS Simulation for Industry Professionals
          </h2>
          <p className="hero__subhead">
            You already design in SOLIDWORKS. Now prove it will hold — set up honest static studies, check every result
            by hand, and report a number you can defend. Level 1 modules release one by one; Level 2 is coming soon.
          </p>
          <div className="hero__actions">
            <Link to={SW_SIM.path} className="btn btn--outline">
              Level 1 — Foundation
            </Link>
            <Link to={SW_SIM.level2Path} className="btn btn--outline">
              Level 2 — Professional
            </Link>
          </div>
          {comboPrice && (
            <p className="sws-home__combo">
              <Link to={`${SW_SIM.path}#combo`}>{COMBO.title}</Link> · {comboPrice}
            </p>
          )}
        </div>

        <div className="hero__visual">
          <div className="course-promo">
            <div className="course-promo__glow" aria-hidden="true" />
            <div className="course-promo__card">
              <span className="course-promo__badge">
                <span className="course-promo__pulse-dot" aria-hidden="true" />
                Modules 0–2 free
              </span>
              <span className="course-promo__ribbon">New</span>

              <span className="course-promo__kicker">New course</span>
              <h3 className="course-promo__title">SOLIDWORKS Simulation Level 1 — Foundation</h3>
              <p className="course-promo__schedule">
                Self-paced · ~{totalHours(LEVEL1_MODULES)} hours · start anytime
              </p>

              <div className="course-promo__tags">
                {TAGS.map((t) => (
                  <span key={t} className="course-promo__tag">
                    {t}
                  </span>
                ))}
              </div>

              <p className="course-promo__copy">
                Linear static analysis of parts, <strong>every result checked by hand</strong> — fixtures, loads, mesh
                convergence, failure criteria and a validation report you can defend.
              </p>

              <ul className="course-promo__included" aria-label="What's included">
                {INCLUDED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              {price && (
                <div className="course-promo__price-row">
                  <span className="course-promo__price sws-home__price">{price}</span>
                </div>
              )}
              {offer && <p className="sws-home__offer">{offer}</p>}

              <div className="course-promo__cta-row">
                <Link to={lessonPath} className="course-promo__cta" onClick={startFree}>
                  Start Module 1 free →
                </Link>
                <span className="course-promo__caption">Free sign-up · no card</span>
                <Link to={SW_SIM.path} className="course-promo__secondary">
                  View Course
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
