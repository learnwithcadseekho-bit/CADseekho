import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { RichContent } from "@/components/RichContent";
import { ChapterMedia } from "@/components/ChapterMedia";
import { getCourseDetailBySlug } from "@/services/courseService";
import { getRegistration, registerForCourse } from "@/services/courseRegistrationService";
import { startCourseCheckout } from "@/services/paymentService";
import { COURSE_FORMAT_LABEL, COURSE_LEVEL_LABEL, type CourseDetail } from "@/types/course";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import "@/styles/cards.css";
import "./course-detail.css";

// Generic examples from Section 14 — not per-course data, no schema column
// backs this, so it's the same list on every course page.
const WHO_IS_THIS_FOR = ["Students", "Beginners", "Mechanical engineers", "Designers", "Working professionals"];

type LoadState = "loading" | "not-found" | "error" | "ready";

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    if (!slug) return;
    setState("loading");
    getCourseDetailBySlug(slug)
      .then((c) => {
        if (!c) {
          setState("not-found");
          return;
        }
        setCourse(c);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [slug]);

  if (state === "loading") {
    return (
      <section className="section container">
        <p className="section__status">Loading…</p>
      </section>
    );
  }

  if (state === "not-found") {
    return (
      <section className="section container" style={{ textAlign: "center" }}>
        <span className="mono-label">ERROR — 404</span>
        <h1 style={{ marginTop: "var(--space-2)" }}>Course not found</h1>
        <p style={{ marginTop: "var(--space-4)" }}>
          <Link to="/courses" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Browse all courses →
          </Link>
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="section container">
        <p className="section__status">Something went wrong loading this course. Please try again later.</p>
      </section>
    );
  }

  const c = course!;

  const hasNextBatch = c.format === "live" && Boolean(c.next_batch_date);
  const enrolledCount = Math.max(c.registration_count, c.manual_enrolled_count ?? 0);
  const seatsLeft = c.seat_capacity != null ? Math.max(c.seat_capacity - enrolledCount, 0) : null;

  const faqItems: { question: string; answer: string }[] = [
    {
      question: "Is this course live or self-paced?",
      answer:
        c.format === "live"
          ? hasNextBatch
            ? `This is a live, instructor-led course. The next batch starts ${formatBatchDate(c.next_batch_date!)}.`
            : "This is a live, instructor-led course."
          : "This is a self-paced, online course — you can start anytime and learn at your own pace.",
    },
    ...(c.prerequisites
      ? [{ question: "Do I need any prior experience to join this course?", answer: c.prerequisites }]
      : []),
    ...c.course_faqs.map((f) => ({ question: f.question, answer: f.answer })),
  ];

  const infoItems: { label: string; value: string }[] = [
    c.level && { label: "Level", value: COURSE_LEVEL_LABEL[c.level] },
    c.software && { label: "Software", value: c.software },
    c.category && { label: "Category", value: c.category.name },
    { label: "Format", value: COURSE_FORMAT_LABEL[c.format] },
    hasNextBatch && { label: "Next Batch", value: formatBatchDate(c.next_batch_date!) },
    c.prerequisites && { label: "Prerequisites", value: c.prerequisites },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <>
      <Seo
        title={c.title}
        description={c.short_description ?? c.description ?? undefined}
        image={c.image ?? undefined}
      />
      <section className="course-hero">
        <div className="course-hero__grid-bg blueprint-grid" aria-hidden="true" />
        <div className="container course-hero__inner">
          {c.category && <span className="mono-label">{c.category.name}</span>}
          <h1 className="course-hero__title">{c.title}</h1>
          {c.short_description && <p className="course-hero__desc">{c.short_description}</p>}
          <div className="course-hero__meta">
            {c.level && <span className="course-hero__badge">{COURSE_LEVEL_LABEL[c.level]}</span>}
            {hasNextBatch && (
              <span className="course-hero__badge course-hero__badge--accent">
                Next batch starts {formatBatchDate(c.next_batch_date!)}
              </span>
            )}
            {enrolledCount > 0 && (
              <span className="course-hero__badge">
                {enrolledCount} {enrolledCount === 1 ? "student" : "students"} already enrolled
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="section container course-detail__grid">
        <div className="course-detail__main">
          {c.description && (
            <article className="course-detail__block">
              <h2>Course Overview</h2>
              <RichContent content={c.description} className="rich-content" />
            </article>
          )}

          <article className="course-detail__block">
            <h2>Who Is This Course For?</h2>
            <ul className="course-detail__list">
              {WHO_IS_THIS_FOR.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          {c.prerequisites && (
            <article className="course-detail__block">
              <h2>Prerequisites</h2>
              <p>{c.prerequisites}</p>
            </article>
          )}

          {c.course_modules.length > 0 && (
            <article className="course-detail__block">
              <h2>What You Will Learn</h2>
              <ul className="course-detail__list">
                {c.course_modules.map((m) => (
                  <li key={m.id}>{m.title}</li>
                ))}
              </ul>
            </article>
          )}

          {c.course_modules.length > 0 && (
            <article className="course-detail__block">
              <h2>Course Syllabus</h2>
              <ol className="syllabus-list">
                {c.course_modules.map((m) => {
                  const hasMedia = Boolean(m.image || m.model3d);
                  return (
                    <li
                      key={m.id}
                      className={`syllabus-list__item${hasMedia ? " syllabus-list__item--media" : ""}`}
                    >
                      <div className="syllabus-list__body">
                        <span className="mono-label">Module {m.order_number}</span>
                        <span className="syllabus-list__title">{m.title}</span>
                        {m.description && (
                          <div
                            className="syllabus-list__desc"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.description) }}
                          />
                        )}
                      </div>
                      <ChapterMedia
                        image={m.image}
                        model3d={m.model3d}
                        alt={m.media_alt || m.title}
                        figure={m.order_number}
                      />
                    </li>
                  );
                })}
              </ol>
            </article>
          )}

          {c.course_skills.length > 0 && (
            <article className="course-detail__block">
              <h2>Skills You Will Gain</h2>
              <div className="skill-tags">
                {c.course_skills.map((s) => (
                  <span key={s.id} className="skill-tag">
                    {s.skill_name}
                  </span>
                ))}
              </div>
            </article>
          )}

          {c.course_testimonials.length > 0 && (
            <article className="course-detail__block">
              <h2>What Students Say</h2>
              <div className="testimonial-list">
                {c.course_testimonials.map((t) => (
                  <blockquote className="testimonial-card" key={t.id}>
                    {t.student_photo ? (
                      <img src={t.student_photo} alt={t.student_name} className="testimonial-card__photo" />
                    ) : (
                      <span className="testimonial-card__photo testimonial-card__photo--placeholder" aria-hidden="true">
                        {t.student_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="testimonial-card__text">“{t.testimonial}”</p>
                      <cite className="testimonial-card__name">{t.student_name}</cite>
                    </div>
                  </blockquote>
                ))}
              </div>
            </article>
          )}

          {faqItems.length > 0 && (
            <article className="course-detail__block">
              <h2>Frequently Asked Questions</h2>
              <div className="faq-list">
                {faqItems.map((item) => (
                  <details className="faq-item" key={item.question}>
                    <summary className="faq-item__question">{item.question}</summary>
                    <p className="faq-item__answer">{item.answer}</p>
                  </details>
                ))}
              </div>
            </article>
          )}
        </div>

        <aside className="course-detail__sidebar drafting-frame">
          {c.price != null && <CoursePrice course={c} seatsLeft={seatsLeft} />}
          <RegisterCTA course={c} />

          <span className="mono-label">Course Information</span>
          <dl className="course-info">
            {infoItems.map((item) => (
              <div className="course-info__row" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>
    </>
  );
}

const CURRENCY_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatBatchDate(isoDate: string): string {
  // isoDate is a plain "YYYY-MM-DD" (date-only) column value — parsing it
  // directly would read as UTC midnight and can roll back a day in
  // timezones behind UTC, so anchor it to local midnight instead.
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ctaLabel(course: CourseDetail): string {
  return course.price != null ? `Enroll for ${CURRENCY_FORMAT.format(course.price)}` : "Register / Get Access";
}

const LOW_SEATS_THRESHOLD = 10;

function CoursePrice({ course, seatsLeft }: { course: CourseDetail; seatsLeft: number | null }) {
  const { price, original_price } = course;
  if (price == null) return null;

  const hasDiscount = original_price != null && original_price > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / original_price!) * 100) : null;

  return (
    <div className="course-price">
      <div className="course-price__row">
        <span className="course-price__current">{CURRENCY_FORMAT.format(price)}</span>
        {hasDiscount && (
          <span className="course-price__original">{CURRENCY_FORMAT.format(original_price!)}</span>
        )}
      </div>
      <div className="course-price__badges">
        {discountPercent !== null && discountPercent > 0 && (
          <span className="course-price__badge">{discountPercent}% OFF</span>
        )}
        {seatsLeft !== null && (
          <span
            className={`course-price__seats${seatsLeft <= LOW_SEATS_THRESHOLD ? " course-price__seats--low" : ""}`}
          >
            {seatsLeft > 0 ? `${seatsLeft} seats left` : "Seats full"}
          </span>
        )}
      </div>
    </div>
  );
}

function RegisterCTA({ course }: { course: CourseDetail }) {
  const { session, user, profile } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<"checking" | "idle" | "registered" | "enrolled" | "submitting">(
    session ? "checking" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPaid = course.price != null;
  // ?enroll=1 (e.g. the homepage promo card) opens checkout on arrival —
  // including after a detour through /login, which preserves the query.
  const autoEnroll = searchParams.get("enroll") === "1";

  useEffect(() => {
    if (!user) return;
    getRegistration(course.id, user.id)
      .then((reg) => setStatus(!reg ? "idle" : reg.status === "enrolled" ? "enrolled" : "registered"))
      .catch(() => setStatus("idle"));
  }, [user, course.id]);

  async function handleRegister() {
    if (!user) return;
    setStatus("submitting");
    setErrorMessage(null);
    try {
      await registerForCourse(course.id, user.id);
      setStatus("registered");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  async function handleCheckout() {
    if (!user) return;
    const previous = status;
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const result = await startCourseCheckout(course.id, {
        name: profile?.full_name,
        email: profile?.email ?? user.email,
        contact: profile?.phone ?? undefined,
      });
      setStatus(result === "enrolled" ? "enrolled" : previous);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus(previous);
    }
  }

  useEffect(() => {
    if (!autoEnroll || !isPaid || (status !== "idle" && status !== "registered")) return;
    setSearchParams(
      (params) => {
        params.delete("enroll");
        return params;
      },
      { replace: true }
    );
    handleCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once, when the registration check settles
  }, [autoEnroll, isPaid, status]);

  if (!session) {
    return (
      <Link to="/login" state={{ from: location }} className="btn btn--primary">
        {ctaLabel(course)}
      </Link>
    );
  }

  if (status === "checking") {
    return (
      <button type="button" className="btn btn--primary" disabled>
        Checking…
      </button>
    );
  }

  if (status === "enrolled" || (status === "registered" && !isPaid)) {
    return (
      <button type="button" className="btn btn--outline" disabled>
        {status === "enrolled" ? "✓ Enrolled" : "✓ Registered"}
      </button>
    );
  }

  return (
    <div className="course-register">
      {errorMessage && <p className="field__error">{errorMessage}</p>}
      <button
        type="button"
        className="btn btn--primary"
        onClick={isPaid ? handleCheckout : handleRegister}
        disabled={status === "submitting"}
      >
        {status === "submitting" ? (isPaid ? "Opening checkout…" : "Registering…") : ctaLabel(course)}
      </button>
    </div>
  );
}
