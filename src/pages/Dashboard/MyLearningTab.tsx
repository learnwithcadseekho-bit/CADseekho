import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyLearning, learnPath, type LearningCard } from "@/services/lessonService";
import { courseOffer } from "@/content/learn";

const ACCESS_LABEL: Record<LearningCard["access"], string> = {
  enrolled: "Enrolled",
  expired: "Access expired",
  preview: "Free preview",
  admin: "Admin access",
};

const LEVEL_LABEL: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Recorded courses the user can open, with progress and "Continue" — from public.my_learning. */
export function MyLearningTab() {
  const [cards, setCards] = useState<LearningCard[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMyLearning()
      .then(setCards)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="section__status">Couldn't load your courses. Please try again later.</p>;
  if (cards === null) return <p className="section__status">Loading…</p>;
  if (cards.length === 0) {
    return (
      <div className="dashboard-empty">
        <p>No recorded courses yet.</p>
        <Link to="/courses/solidworks-simulation" className="btn btn--primary">
          Start SOLIDWORKS Simulation free
        </Link>
      </div>
    );
  }

  return (
    <ul className="learning-cards">
      {cards.map((c) => {
        const pct = c.totalLessons ? Math.round((c.completedLessons / c.totalLessons) * 100) : 0;
        const offer = courseOffer(c.slug, c.title);
        const started = c.nextPositionSec > 0 || c.completedLessons > 0;
        return (
          <li key={c.courseId} className="learning-card">
            <div className="learning-card__head">
              <span className="mono-label">{ACCESS_LABEL[c.access]}</span>
              {c.level && <span className="learning-card__badge">{LEVEL_LABEL[c.level] ?? c.level}</span>}
            </div>
            <h3 className="learning-card__title">{c.title}</h3>

            <div className="learning-card__progress">
              <div
                className="learning-card__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`${c.title} progress`}
              >
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className="learning-card__pct">
                {pct}% · {c.completedLessons}/{c.totalLessons} lessons
              </span>
            </div>

            {c.expiresAt && (
              <p className="learning-card__meta">
                {c.access === "expired" ? "Access ended" : "Access until"} {formatDate(c.expiresAt)}
              </p>
            )}

            <div className="learning-card__actions">
              {c.nextLessonCode && (
                <Link to={learnPath(c.slug, c.nextLessonCode)} className="btn btn--primary">
                  {started ? "Continue" : "Start"}: {c.nextLessonCode} {c.nextLessonTitle}
                </Link>
              )}
              {(c.access === "preview" || c.access === "expired") && (
                <Link to={offer.path} className="btn btn--outline">
                  {c.access === "expired" ? "Renew access" : "Unlock full course"}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
