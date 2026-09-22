import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCourseDetailBySlug } from "@/services/courseService";
import type { CourseDetail } from "@/types/course";
import { HeroImageSlider } from "./HeroImageSlider";
import "./home.css";

// Keep this in sync with the course the homepage should feature — swapping
// the slug is enough, the card always reflects live price/curriculum data.
const FEATURED_COURSE_SLUG = "ansys-workbench-level-1";
const LOW_SEATS_THRESHOLD = 10;
const MAX_TAGS = 5;
// Weekly class days aren't a schema column — no per-course field for this
// exists yet, so it's scoped to this one featured card like the slug above.
const WEEKLY_SCHEDULE_DAYS = "Fri, Sat & Sun";

const CURRENCY_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatBatchDate(isoDate: string): string {
  // Anchor to local midnight — a bare "YYYY-MM-DD" parses as UTC and can
  // roll back a day in timezones behind UTC.
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

export function CoursePromoCard() {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getCourseDetailBySlug(FEATURED_COURSE_SLUG)
      .then((c) => (c ? setCourse(c) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  // Course missing/unpublished or the fetch failed — fall back to the
  // gallery slider (itself falls back to the drafting sketch) rather than
  // leaving the hero's right column broken.
  if (failed) return <HeroImageSlider />;
  if (!course) return <div className="course-promo course-promo--loading" aria-hidden="true" />;

  const enrolledCount = Math.max(course.registration_count, course.manual_enrolled_count ?? 0);
  const seatsLeft = course.seat_capacity != null ? Math.max(course.seat_capacity - enrolledCount, 0) : null;
  const hasNextBatch = course.format === "live" && Boolean(course.next_batch_date);
  const hasDiscount = course.original_price != null && course.price != null && course.original_price > course.price;

  const statusLabel =
    seatsLeft !== null && seatsLeft > 0 && seatsLeft <= LOW_SEATS_THRESHOLD
      ? `Only ${seatsLeft} seats left`
      : hasNextBatch
        ? "New batch enrolling"
        : "Enrolling now";

  return (
    <div className="course-promo">
      <div className="course-promo__glow" aria-hidden="true" />
      <div className="course-promo__card">
        <span className="course-promo__badge">
          <span className="course-promo__pulse-dot" aria-hidden="true" />
          {statusLabel}
        </span>
        <span className="course-promo__ribbon">Featured</span>

        <span className="course-promo__kicker">Featured course</span>
        <h3 className="course-promo__title">{course.title}</h3>

        {hasNextBatch && (
          <p className="course-promo__schedule">
            Live classes start {formatBatchDate(course.next_batch_date!)} · {WEEKLY_SCHEDULE_DAYS}
          </p>
        )}

        {course.course_skills.length > 0 && (
          <div className="course-promo__tags">
            {course.course_skills.slice(0, MAX_TAGS).map((s) => (
              <span key={s.id} className="course-promo__tag">
                {s.skill_name}
              </span>
            ))}
          </div>
        )}

        <p className="course-promo__copy">
          Every simulation is <strong>validated against hand calculations</strong> before you
          trust the software — the same solve-by-hand-first method used across CADseekho’s
          curriculum.
        </p>

        {course.price != null && (
          <div className="course-promo__price-row">
            <span className="course-promo__price">{CURRENCY_FORMAT.format(course.price)}</span>
            {hasDiscount && (
              <span className="course-promo__price-original">
                {CURRENCY_FORMAT.format(course.original_price!)}
              </span>
            )}
          </div>
        )}

        <div className="course-promo__cta-row">
          {/* ?enroll=1 opens the course page's own checkout on arrival (priced courses only). */}
          <Link to={`/courses/${course.slug}${course.price != null ? "?enroll=1" : ""}`} className="course-promo__cta">
            Enroll Now →
          </Link>
          <span className="course-promo__caption">
            {course.format === "live" ? "Live, instructor-led" : "Self-paced"} · online
          </span>
        </div>
      </div>
    </div>
  );
}
