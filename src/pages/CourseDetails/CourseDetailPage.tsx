import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { getCourseDetailBySlug } from "@/services/courseService";
import { getRegistration, registerForCourse } from "@/services/courseRegistrationService";
import { COURSE_FORMAT_LABEL, COURSE_LEVEL_LABEL, type CourseDetail } from "@/types/course";
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
  const hasProjects = c.course_modules.some((m) => /project/i.test(m.title));

  const infoItems: { label: string; value: string }[] = [
    c.level && { label: "Level", value: COURSE_LEVEL_LABEL[c.level] },
    c.software && { label: "Software", value: c.software },
    c.category && { label: "Category", value: c.category.name },
    { label: "Format", value: COURSE_FORMAT_LABEL[c.format] },
    { label: "Projects", value: hasProjects ? "Included" : "Not included" },
    c.prerequisites && { label: "Prerequisites", value: c.prerequisites },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <>
      <Seo
        title={c.title}
        description={c.short_description ?? c.description ?? undefined}
        image={c.image ?? undefined}
      />
      <section className="course-hero blueprint-grid">
        <div className="container course-hero__inner">
          {c.category && <span className="mono-label">{c.category.name}</span>}
          <h1 className="course-hero__title">{c.title}</h1>
          {c.short_description && <p className="course-hero__desc">{c.short_description}</p>}
          <div className="course-hero__meta">
            {c.level && <span className="course-hero__badge">{COURSE_LEVEL_LABEL[c.level]}</span>}
          </div>
          <RegisterCTA course={c} />
        </div>
      </section>

      <section className="section container course-detail__grid">
        <div className="course-detail__main">
          {c.description && (
            <article className="course-detail__block">
              <h2>Course Overview</h2>
              <p>{c.description}</p>
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
                {c.course_modules.map((m) => (
                  <li key={m.id} className="syllabus-list__item">
                    <span className="mono-label">Module {m.order_number}</span>
                    <span className="syllabus-list__title">{m.title}</span>
                    {m.description && <p className="syllabus-list__desc">{m.description}</p>}
                  </li>
                ))}
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
        </div>

        <aside className="course-detail__sidebar drafting-frame">
          <span className="mono-label">Course Information</span>
          <dl className="course-info">
            {infoItems.map((item) => (
              <div className="course-info__row" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          <RegisterCTA course={c} />
        </aside>
      </section>
    </>
  );
}

function RegisterCTA({ course }: { course: CourseDetail }) {
  const { session, user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "idle" | "registered" | "submitting" | "error">(
    session ? "checking" : "idle"
  );

  useEffect(() => {
    if (!user) return;
    getRegistration(course.id, user.id)
      .then((reg) => setStatus(reg ? "registered" : "idle"))
      .catch(() => setStatus("idle"));
  }, [user, course.id]);

  async function handleRegister() {
    if (!user) return;
    setStatus("submitting");
    try {
      await registerForCourse(course.id, user.id);
      setStatus("registered");
    } catch {
      setStatus("error");
    }
  }

  if (!session) {
    return (
      <Link to="/login" state={{ from: location }} className="btn btn--primary">
        Register / Get Access
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

  if (status === "registered") {
    return (
      <button type="button" className="btn btn--outline" disabled>
        ✓ Registered
      </button>
    );
  }

  return (
    <div className="course-register">
      {status === "error" && <p className="field__error">Something went wrong. Please try again.</p>}
      <button
        type="button"
        className="btn btn--primary"
        onClick={handleRegister}
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Registering…" : "Register / Get Access"}
      </button>
    </div>
  );
}
