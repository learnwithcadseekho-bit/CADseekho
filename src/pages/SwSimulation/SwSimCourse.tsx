import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { useCachedData } from "@/hooks/useCachedData";
import { faqSchema } from "@/lib/schema";
import { trackBeginCheckout, trackCustom, trackViewContent } from "@/lib/track";
import { absoluteUrl, BUSINESS, SITE_URL } from "@/config/site";
import { getCourseSyllabus, type ModuleWithLessons } from "@/services/lessonService";
import { startCourseCheckoutBySlug } from "@/services/paymentService";
import {
  COMBO,
  SIGNUP_INTENT,
  SIGNUP_INTENT_KEY,
  SW_SIM,
  SW_SIM_CONFIG,
  currentPrice,
  formatInr,
  moduleLabel,
  offerNote,
  priceLine,
  purchasable,
  totalHours,
  type SwSimLesson,
  type SwSimModule,
  type SwSimPage,
} from "@/content/swSimulation";
import type { SwSimProduct } from "../../../supabase/functions/_shared/swSimulationPricing.ts";
import { NotifyForm } from "./NotifyForm";
import "@/styles/cards.css";
import "../CourseDetails/course-detail.css";
import "../Launch/launch.css";
import "./sw-simulation.css";

type Interest = "level1" | "level2" | "combo" | "team" | "";

const FIRST_FREE_LESSON = "M1.1";
const lessonPath = (code: string) => `${SW_SIM.classroomPath}/${encodeURIComponent(code)}`;

/** Live Level 1 lesson rows from the database, by module code. Missing tables/rows → the content file alone. */
function useLiveSyllabus(enabled: boolean) {
  const slug = SW_SIM_CONFIG.courseSlugs.level1;
  const { data } = useCachedData(enabled ? `lessons:syllabus:${slug}` : null, async () => {
    try {
      return await getCourseSyllabus(slug);
    } catch (err) {
      console.warn("sw-simulation: syllabus not available from the database yet", err);
      return null;
    }
  });
  return useMemo(() => new Map((data ?? []).filter((m) => m.code).map((m) => [m.code!, m])), [data]);
}

function courseJsonLd(page: SwSimPage) {
  const url = absoluteUrl(page.path);
  const price = currentPrice(page.level);
  const free = page.modules.filter((m) => m.free);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: page.title,
    description: page.seoDescription,
    url,
    image: absoluteUrl(page.ogImage),
    provider: { "@type": "EducationalOrganization", "@id": `${SITE_URL}/#organization`, name: BUSINESS.name, url: `${SITE_URL}/` },
    inLanguage: "en",
    educationalLevel: page.level === "level1" ? "Beginner–Intermediate" : "Intermediate–Advanced",
    teaches: page.skills.map((s) => s.group).join(", "),
    ...(page.prerequisites && { coursePrerequisites: page.prerequisites }),
    isAccessibleForFree: false,
    ...(price !== null && {
      offers: {
        "@type": "Offer",
        category: "Paid",
        price,
        priceCurrency: SW_SIM_CONFIG.currency,
        url,
        availability: purchasable(page.level) ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      },
    }),
    hasCourseInstance: [
      { "@type": "CourseInstance", courseMode: "Online", courseWorkload: `PT${totalHours(page.modules)}H`, inLanguage: "en" },
    ],
    ...(free.length > 0 && {
      hasPart: free.map((m) => ({
        "@type": "LearningResource",
        name: `${moduleLabel(m.code)}: ${m.title}`,
        isAccessibleForFree: true,
        timeRequired: `PT${m.hours}H`,
      })),
    }),
  };
}

/** One SOLIDWORKS Simulation course page (Level 1 or Level 2), all copy from content/swSimulation.ts. */
export function SwSimCourse({ page }: { page: SwSimPage }) {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const isLevel1 = page.level === "level1";
  const live = useLiveSyllabus(isLevel1);
  const [interest, setInterest] = useState<Interest>("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<SwSimProduct | null>(null);
  const signedIn = Boolean(session);
  const price = priceLine(page.level);
  const comboPrice = priceLine("combo");

  useEffect(() => {
    trackViewContent({ name: page.title, id: SW_SIM_CONFIG.courseSlugs[page.level], value: currentPrice(page.level) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page view
  }, [page.level]);

  /** Signed out → free signup (then back to the lesson). Signed in → the lesson. */
  function startFree(e: MouseEvent<HTMLAnchorElement>, code = FIRST_FREE_LESSON) {
    trackCustom("sw_sim_lesson_start", { lesson_code: code, signed_in: signedIn });
    if (signedIn) return; // plain link to the lesson
    e.preventDefault();
    try {
      sessionStorage.setItem(SIGNUP_INTENT_KEY, SIGNUP_INTENT);
    } catch {
      // storage blocked: the signup still works, just without the event
    }
    navigate("/signup", { state: { from: { pathname: lessonPath(code) } } });
  }

  function joinWaitlist(product: Interest) {
    setInterest(product);
    const el = document.getElementById("waitlist");
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    document.getElementById("notify-name")?.focus({ preventScroll: true });
  }

  async function enrol(product: SwSimProduct) {
    setCheckoutError(null);
    if (!signedIn) {
      navigate("/login", { state: { from: { pathname: page.path } } });
      return;
    }
    const slug = SW_SIM_CONFIG.courseSlugs[product];
    setCheckoutBusy(product);
    trackBeginCheckout({ name: product === "combo" ? COMBO.title : page.title, id: slug, value: currentPrice(product) });
    try {
      const result = await startCourseCheckoutBySlug(slug, {
        name: profile?.full_name ?? undefined,
        email: profile?.email ?? undefined,
        contact: profile?.phone ?? undefined,
      });
      if (result === "enrolled") navigate(lessonPath(FIRST_FREE_LESSON));
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Couldn't start checkout.");
    } finally {
      setCheckoutBusy(null);
    }
  }

  const primary = isLevel1 ? (
    <Link to={lessonPath(FIRST_FREE_LESSON)} className="btn btn--primary btn--block" onClick={(e) => startFree(e)}>
      Start Module 1 free
    </Link>
  ) : purchasable("level2") ? (
    <button type="button" className="btn btn--primary btn--block" disabled={checkoutBusy !== null} onClick={() => enrol("level2")}>
      {checkoutBusy === "level2" ? "Opening checkout…" : "Enrol now"}
    </button>
  ) : (
    <button type="button" className="btn btn--primary btn--block" onClick={() => joinWaitlist("level2")}>
      Join the waitlist
    </button>
  );

  return (
    <div className="sws">
      <Seo
        title={page.seoTitle}
        description={page.seoDescription}
        image={page.ogImage}
        canonical={page.path}
        breadcrumbs={[
          { name: "Courses", path: "/courses" },
          { name: "SolidWorks", path: "/courses/category/solidworks" },
          { name: isLevel1 ? "SOLIDWORKS Simulation Level 1" : "SOLIDWORKS Simulation Level 2", path: page.path },
        ]}
        jsonLd={[courseJsonLd(page), faqSchema(page.faqs)].filter((x): x is Record<string, unknown> => x !== null)}
      />

      {/* Header */}
      <section className="course-hero">
        <div className="course-hero__grid-bg blueprint-grid" aria-hidden="true" />
        <div className="container course-hero__inner sws-header">
          <span className="mono-label">{page.label}</span>
          <h1 className="course-hero__title">{page.title}</h1>
          <div className="course-hero__meta">
            {page.tags.map((t, i) => (
              <span key={t} className={`course-hero__badge${i === page.tags.length - 1 ? " course-hero__badge--accent" : ""}`}>
                {t}
              </span>
            ))}
          </div>
          <p className="sws-header__switch">
            {isLevel1 ? (
              <>
                Next: <Link to={SW_SIM.level2Path}>Level 2 — Professional →</Link>
              </>
            ) : (
              <>
                Start with <Link to={SW_SIM.path}>Level 1 — Foundation (Modules 1–2 free) →</Link>
              </>
            )}
          </p>
        </div>
      </section>

      <section className="section container course-detail__grid">
        <div className="course-detail__main">
          <article className="course-detail__block">
            <h2>Course Overview</h2>
            <p>{page.overview}</p>
          </article>

          <article className="course-detail__block">
            <h2>Course Description</h2>
            {page.description.map((p) => (
              <p key={p.slice(0, 32)} className="sws-para">
                {p}
              </p>
            ))}
          </article>

          <article className="course-detail__block">
            <h2>What You Will Learn</h2>
            <p className="sws-para">By the end of this course you will be able to:</p>
            <ul className="course-detail__list">
              {page.learn.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="course-detail__block">
            <h2>Course Learning Outcomes</h2>
            <p className="sws-para">After completing this course, learners will be able to:</p>
            <ol className="sws-outcomes">
              {page.outcomes.map((o) => (
                <li key={o.title}>
                  <strong>{o.title}</strong> — {o.body}
                </li>
              ))}
            </ol>
          </article>

          <article className="course-detail__block launch-anchor" id="modules">
            <h2>Course Modules</h2>
            <div className="sws-modules" role="list">
              {page.modules.map((m, i) => (
                <ModuleRow
                  key={m.code}
                  module={m}
                  column={page.modulesColumn}
                  live={live.get(m.code)}
                  defaultOpen={isLevel1 && i === 1}
                  signedIn={signedIn}
                  onStart={startFree}
                />
              ))}
            </div>
          </article>

          <article className="course-detail__block">
            <h2>Skills You Will Develop</h2>
            <div className="sws-skills">
              {page.skills.map((g) => (
                <div key={g.group} className="sws-skills__group">
                  <h3>{g.group}</h3>
                  <div className="skill-tags">
                    {g.items.map((s) => (
                      <span key={s} className="skill-tag">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="course-detail__block">
            <h2>Who Is This Course For?</h2>
            <ul className="course-detail__list">
              {page.whoFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {page.prerequisites && (
              <p className="sws-para sws-prereq">
                <strong>Prerequisites:</strong> {page.prerequisites}
              </p>
            )}
          </article>

          <article className="course-detail__block launch-anchor" id="faq">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              {page.faqs.map((item) => (
                <details className="faq-item" key={item.question}>
                  <summary className="faq-item__question">{item.question}</summary>
                  <p className="faq-item__answer">
                    {item.question === "Can my company enrol a team?" ? (
                      <>
                        Yes. Teams of 5 or more get a discounted team licence —{" "}
                        <a href="#waitlist" onClick={(e) => (e.preventDefault(), joinWaitlist("team"))}>
                          contact us
                        </a>
                        .
                      </>
                    ) : (
                      item.answer
                    )}
                  </p>
                </details>
              ))}
            </div>
          </article>
        </div>

        <div className="sws-side">
          <aside className="course-detail__sidebar drafting-frame" aria-label="Course information">
            {price && <p className="sws-side__price">{price}</p>}
            {offerNote(page.level) && <p className="sws-offer">{offerNote(page.level)}</p>}
            {primary}
            {isLevel1 &&
              (purchasable("level1") ? (
                <button
                  type="button"
                  className="btn btn--outline btn--block"
                  disabled={checkoutBusy !== null}
                  onClick={() => enrol("level1")}
                >
                  {checkoutBusy === "level1" ? "Opening checkout…" : `Enrol — ${formatInr(currentPrice("level1")!)} + GST`}
                </button>
              ) : (
                <button type="button" className="sws-side__link" onClick={() => joinWaitlist("level1")}>
                  Join the founding-batch waitlist
                </button>
              ))}
            {checkoutError && (
              <p className="field__error" role="alert">
                {checkoutError}
              </p>
            )}
            <span className="mono-label">Course Information</span>
            <dl className="course-info">
              {page.info.map((item) => (
                <div className="course-info__row" key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
              {price && (
                <div className="course-info__row">
                  <dt>Price</dt>
                  <dd>{price}</dd>
                </div>
              )}
            </dl>
          </aside>

          {/* Combo card */}
          <aside className="sws-combo drafting-frame launch-anchor" id="combo" aria-labelledby="sws-combo-title">
            <span className="sws-badge">{COMBO.label}</span>
            <h2 className="sws-combo__title" id="sws-combo-title">
              {COMBO.title}
            </h2>
            <p className="sws-combo__line">{COMBO.line}</p>
            {comboPrice && <p className="sws-combo__price">{comboPrice}</p>}
            {offerNote("combo") && <p className="sws-offer sws-offer--combo">{offerNote("combo")}</p>}
            {purchasable("combo") ? (
              <button type="button" className="btn btn--primary btn--block" disabled={checkoutBusy !== null} onClick={() => enrol("combo")}>
                {checkoutBusy === "combo" ? "Opening checkout…" : COMBO.button}
              </button>
            ) : (
              <button type="button" className="btn btn--outline btn--block" onClick={() => joinWaitlist("combo")}>
                {COMBO.button}
              </button>
            )}
            {!purchasable("combo") && <p className="sws-combo__note">Enrollment opens soon — join the waitlist for the founding price.</p>}
          </aside>
        </div>
      </section>

      {/* Waitlist / notify */}
      <section className="section container launch-anchor" id="waitlist" aria-labelledby="sws-waitlist">
        <div className="launch-split">
          <div>
            <span className="mono-label">Waitlist</span>
            <h2 className="launch-h2" id="sws-waitlist">
              {isLevel1 ? "Get the founding-batch price" : "Join the Level 2 waitlist"}
            </h2>
            <p className="sws-para">
              {isLevel1
                ? "Modules 0, 1 and 2 are free with sign-up. Join the waitlist and we'll tell you first when paid enrollment opens."
                : "Get the launch price and be told first when Level 2 opens."}{" "}
              Companies enrolling a team of 5 or more: choose “Team”.
            </p>
          </div>
          <div className="launch-form-card drafting-frame">
            <NotifyForm interest={interest} onInterestChange={setInterest} />
          </div>
        </div>
      </section>

      {/* Sticky mobile bar */}
      <div className="launch-sticky" role="region" aria-label="Quick actions">
        {isLevel1 ? (
          <Link to={lessonPath(FIRST_FREE_LESSON)} className="btn btn--primary" onClick={(e) => startFree(e)}>
            Start Module 1 free
          </Link>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => (purchasable("level2") ? enrol("level2") : joinWaitlist("level2"))}>
            {purchasable("level2") ? "Enrol now" : "Join the waitlist"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ModuleRow({
  module,
  column,
  live,
  defaultOpen,
  signedIn,
  onStart,
}: {
  module: SwSimModule;
  column: "Access" | "Licence";
  live?: ModuleWithLessons;
  defaultOpen: boolean;
  signedIn: boolean;
  onStart: (e: MouseEvent<HTMLAnchorElement>, code: string) => void;
}) {
  // The database decides what's released; the content file is the fallback.
  const released = live ? live.is_released : module.released;
  const free = live ? live.is_free : module.free;
  const releaseLabel = live?.release_label ?? module.releaseLabel;
  const liveLessons = new Map((live?.course_lessons ?? []).map((l) => [l.code, l]));

  const access =
    column === "Licence" ? (
      <span className="sws-module__licence">{module.licence}</span>
    ) : free ? (
      <span className="sws-badge">Free</span>
    ) : (
      <span className="sws-badge sws-badge--muted">Paid</span>
    );

  const summary = (
    <>
      <span className="sws-module__code">{moduleLabel(module.code)}</span>
      <span className="sws-module__title">{module.title}</span>
      <span className="sws-module__meta">
        {module.hours !== null && <span className="sws-module__hours">{module.hours} h</span>}
        {access}
        {column === "Access" && !released && (
          <span className="sws-module__soon">{releaseLabel ? `Coming soon · ${releaseLabel}` : "Coming soon"}</span>
        )}
      </span>
    </>
  );

  if (module.lessons.length === 0) {
    return (
      <div className="sws-module" role="listitem">
        <div className="sws-module__summary sws-module__summary--static">{summary}</div>
      </div>
    );
  }

  return (
    <details className="sws-module" open={defaultOpen} role="listitem">
      <summary className="sws-module__summary">{summary}</summary>
      <ol className="sws-lessons">
        {module.lessons.map((lesson) => (
          <LessonItem
            key={lesson.code}
            lesson={lesson}
            playable={released && Boolean(liveLessons.get(lesson.code)?.is_published)}
            free={free}
            signedIn={signedIn}
            onStart={onStart}
          />
        ))}
      </ol>
    </details>
  );
}

function LessonItem({
  lesson,
  playable,
  free,
  signedIn,
  onStart,
}: {
  lesson: SwSimLesson;
  playable: boolean;
  free: boolean;
  signedIn: boolean;
  onStart: (e: MouseEvent<HTMLAnchorElement>, code: string) => void;
}) {
  let action;
  if (!playable) action = <span className="sws-lesson__state">Coming soon</span>;
  else if (!free) action = <span className="sws-lesson__state">Enrolled learners</span>;
  else
    action = (
      <Link to={lessonPath(lesson.code)} className="sws-lesson__play" onClick={(e) => onStart(e, lesson.code)}>
        {signedIn ? "Watch free" : "Sign up free to watch"}
      </Link>
    );
  return (
    <li className="sws-lesson">
      <span className="sws-lesson__code">{lesson.kind === "video" ? lesson.code : ""}</span>
      <span className="sws-lesson__title">{lesson.title}</span>
      {lesson.minutes !== null && <span className="sws-lesson__min">{lesson.minutes} min</span>}
      {action}
    </li>
  );
}
