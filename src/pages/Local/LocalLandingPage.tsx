import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Seo, type Breadcrumb } from "@/components/Seo";
import { EnquiryCta } from "@/components/EnquiryCta";
import { useCachedData } from "@/hooks/useCachedData";
import { getCoursesByCategorySlug } from "@/services/courseService";
import { faqSchema } from "@/lib/schema";
import { BUSINESS } from "@/config/site";
import { AREA_LINK_LABELS, AREA_PATHS, AREAS, METHOD_STEPS, type AreaKey, type AreaSection } from "@/content/localAreas";
import { BATCH_TIMINGS, WEEKLY_SCHEDULE_DAYS } from "@/content/batches";
import { COURSE_FORMAT_LABEL, COURSE_LEVEL_LABEL, type CourseWithCategory } from "@/types/course";
import "@/styles/cards.css";
import "./local.css";

const CURRENCY_FORMAT = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function formatBatchDate(isoDate: string): string {
  // Date-only column: anchor to local midnight so it can't roll back a day.
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

const LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2 } as const;

function Section({ section, children }: { section: AreaSection; children?: ReactNode }) {
  return (
    <section className="local-block">
      <h2>{section.heading}</h2>
      {section.paragraphs.map((p) => (
        <p key={p.slice(0, 40)}>{p}</p>
      ))}
      {section.bullets && (
        <ul className="local-list">
          {section.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}

// Live fees, levels and next batch for every published ANSYS course, so the
// local pages never quote a stale price.
function AnsysCourses() {
  const { data, error } = useCachedData("courses:category:ansys", () => getCoursesByCategorySlug("ansys"));

  if (error) return <p className="section__status">Course details are temporarily unavailable — please contact us.</p>;
  if (!data) {
    return (
      <p className="section__status" aria-busy="true">
        Loading course details…
      </p>
    );
  }

  const courses = [...data].sort(
    (a, b) => (LEVEL_ORDER[a.level ?? "beginner"] ?? 0) - (LEVEL_ORDER[b.level ?? "beginner"] ?? 0)
  );

  return (
    <div className="local-courses">
      {courses.map((c) => (
        <CourseFacts key={c.id} course={c} />
      ))}
    </div>
  );
}

function CourseFacts({ course }: { course: CourseWithCategory }) {
  const hasDiscount = course.price != null && course.original_price != null && course.original_price > course.price;
  const live = course.format === "live";
  return (
    <article className="local-course drafting-frame">
      <span className="mono-label">{course.level ? `${COURSE_LEVEL_LABEL[course.level]} level` : "ANSYS course"}</span>
      <h3 className="local-course__title">
        <Link to={`/courses/${course.slug}`}>{course.title}</Link>
      </h3>
      {course.short_description && <p>{course.short_description}</p>}
      <dl className="local-course__facts">
        <div>
          <dt>Format</dt>
          <dd>{COURSE_FORMAT_LABEL[course.format]}</dd>
        </div>
        {course.price != null && (
          <div>
            <dt>Fee</dt>
            <dd>
              {CURRENCY_FORMAT.format(course.price)}
              {hasDiscount && <s className="local-course__was"> {CURRENCY_FORMAT.format(course.original_price!)}</s>}
            </dd>
          </div>
        )}
        {live && course.next_batch_date && (
          <div>
            <dt>Next batch</dt>
            <dd>{formatBatchDate(course.next_batch_date)}</dd>
          </div>
        )}
        {live && (
          <div>
            <dt>Class days</dt>
            <dd>
              {WEEKLY_SCHEDULE_DAYS}
              {BATCH_TIMINGS ? ` · ${BATCH_TIMINGS}` : " · timings shared on enquiry"}
            </dd>
          </div>
        )}
      </dl>
      <Link to={`/courses/${course.slug}`} className="btn btn--primary btn--sm">
        View syllabus &amp; enrol
      </Link>
    </article>
  );
}

export default function LocalLandingPage({ area }: { area: AreaKey }) {
  const content = AREAS[area];
  const isHub = area === "delhi-ncr";
  const breadcrumbs: Breadcrumb[] = isHub
    ? [{ name: "ANSYS Training in Delhi NCR", path: AREA_PATHS["delhi-ncr"] }]
    : [
        { name: "ANSYS Training in Delhi NCR", path: AREA_PATHS["delhi-ncr"] },
        { name: content.h1, path: content.path },
      ];
  const faq = faqSchema(content.faqs);
  const enquiry = `Hi CADseekho, I'm in ${content.place} and want to know about the next ANSYS batch.`;
  const mapUrl = isHub ? BUSINESS.address?.mapEmbedUrl : undefined;

  return (
    <>
      <Seo
        title={content.title}
        description={content.description}
        canonical={content.path}
        breadcrumbs={breadcrumbs}
        jsonLd={faq ?? undefined}
      />

      <header className="local-hero">
        <div className="local-hero__grid-bg blueprint-grid" aria-hidden="true" />
        <div className="container local-hero__inner">
          <nav className="local-breadcrumb mono-label" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            {!isHub && (
              <>
                <span aria-hidden="true">/</span>
                <Link to={AREA_PATHS["delhi-ncr"]}>Delhi NCR</Link>
              </>
            )}
            <span aria-hidden="true">/</span>
            <span>{content.place}</span>
          </nav>
          <span className="mono-label section-eyebrow">{content.eyebrow}</span>
          <h1 className="local-hero__title">{content.h1}</h1>
          {content.intro.map((p) => (
            <p key={p.slice(0, 40)} className="local-hero__lead">
              {p}
            </p>
          ))}
          <EnquiryCta message={enquiry} />
        </div>
      </header>

      <div className="container local-body">
        <section className="local-block">
          <h2>ANSYS courses, fees and next batch</h2>
          <p>
            Fees and dates below are live from our course catalogue. The same course runs for learners
            in {content.place} and across Delhi NCR.
          </p>
          <AnsysCourses />
        </section>

        <Section section={content.students} />
        <Section section={content.engineers} />

        <section className="local-block">
          <h2>How we teach: hand calculation first, then ANSYS</h2>
          <div className="local-steps">
            {METHOD_STEPS.map((step) => (
              <div key={step.title} className="local-step drafting-frame">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
          <p>
            Try the hand-calculation side for free: the <Link to="/tools/beam-calculator">beam calculator</Link>{" "}
            gives reactions, bending moment and deflection, and the{" "}
            <Link to="/resources/plate-with-hole-stress-concentration-calculator">plate-with-a-hole Kt calculator</Link>{" "}
            gives the stress-concentration number to compare with your ANSYS model.
          </p>
        </section>

        <Section section={content.modes}>
          {mapUrl && (
            <iframe
              className="local-map"
              src={mapUrl}
              title={`${BUSINESS.name} on Google Maps`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </Section>

        {content.extra && (
          <Section section={content.extra}>
            <ul className="local-area-links">
              {(Object.keys(AREAS) as AreaKey[])
                .filter((k) => k !== area)
                .map((k) => (
                  <li key={k}>
                    <Link to={AREA_PATHS[k]}>{AREA_LINK_LABELS[k]} →</Link>
                    <span>{AREAS[k].description}</span>
                  </li>
                ))}
            </ul>
            <p>
              Learners from Greater Noida, Faridabad and Meerut join the same live online batches — the
              pages above for Noida, Delhi and Ghaziabad apply to you too.
            </p>
          </Section>
        )}

        <section className="local-block">
          <h2>Frequently asked questions</h2>
          <div className="local-faq">
            {content.faqs.map((f) => (
              <details key={f.question} className="local-faq__item">
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="local-block local-cta drafting-frame">
          <h2>Ask about the next ANSYS batch</h2>
          <p>
            Tell us where you are in {content.place === "Delhi NCR" ? "the NCR" : content.place}, whether you're a
            student or a working engineer, and whether you'd prefer online or classroom — we'll reply with the
            next suitable batch.
          </p>
          <EnquiryCta message={enquiry} />
          {!isHub && (
            <p className="local-related">
              Also see:{" "}
              {content.related.map((k, i) => (
                <span key={k}>
                  {i > 0 && " · "}
                  <Link to={AREA_PATHS[k]}>{AREA_LINK_LABELS[k]}</Link>
                </span>
              ))}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
