import { Link } from "react-router-dom";
import { getCourseDetailBySlug } from "@/services/courseService";
import { useCachedData } from "@/hooks/useCachedData";
import { useAuth } from "@/hooks/useAuth";
import { FEATURED_ANSYS_SLUG, WEEKLY_SCHEDULE_DAYS } from "@/content/batches";
import { HeroImageSlider } from "./HeroImageSlider";
import "./home.css";

// The featured course lives in content/batches.ts — swapping the slug is enough, the card always reflects live
// price/curriculum data.
const FEATURED_COURSE_SLUG = FEATURED_ANSYS_SLUG;
const LOW_SEATS_THRESHOLD = 10;
const MAX_TAGS = 5;
// What a buyer gets alongside the classes. Paid members unlock the
// Resources hub's partial/paid items (any enrolled course), so only list
// kinds of material that actually live there.
const INCLUDED = ["Live online classes", "Practice part files", "PDF notes", "Members-only resources"];

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
  // Admins have every course free: no price, and the CTA goes to the class.
  const isAdmin = useAuth().profile?.role === "admin";
  const { data, error } = useCachedData(`course:${FEATURED_COURSE_SLUG}`, () => getCourseDetailBySlug(FEATURED_COURSE_SLUG));
  const course = data ?? null;
  const failed = Boolean(error) || data === null;

  // Course missing/unpublished or the fetch failed — fall back to the
  // gallery slider (itself falls back to the drafting sketch) rather than
  // leaving the hero's right column broken.
  if (failed) return <HeroImageSlider />;
  if (!course) return <div className="course-promo course-promo--loading" aria-hidden="true" aria-busy="true" />;

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

        {/* Copy is written for the featured course above (Level 1 = Workbench
            fundamentals). Validating results against hand calculations belongs
            to the next, advanced course — don't promise it here. Update this
            text if FEATURED_COURSE_SLUG changes. */}
        <p className="course-promo__copy">
          Learn the <strong>complete ANSYS Workbench workflow</strong> — geometry, meshing, loads
          and supports, solving and reviewing results — hands-on, on real engineering parts.
        </p>

        <ul className="course-promo__included" aria-label="What's included">
          {INCLUDED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {course.price != null && !isAdmin && (
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
          {isAdmin ? (
            <Link
              to={course.format === "live" ? `/classroom/${course.slug}` : `/courses/${course.slug}`}
              className="course-promo__cta"
            >
              {course.format === "live" ? "Join Live Class (Admin) →" : "Open Course (Admin) →"}
            </Link>
          ) : (
            <Link to={`/courses/${course.slug}${course.price != null ? "?enroll=1" : ""}`} className="course-promo__cta">
              Enroll Now →
            </Link>
          )}
          <span className="course-promo__caption">
            {course.format === "live" ? "Live, instructor-led" : "Self-paced"} · online
          </span>
          <Link to={`/courses/${course.slug}`} className="course-promo__secondary">
            View Course
          </Link>
        </div>
      </div>
    </div>
  );
}
