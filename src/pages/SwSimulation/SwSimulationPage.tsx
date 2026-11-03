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
  DIFFERENT,
  FAQS,
  LEVEL1_MODULES,
  LEVEL2_MODULES,
  SIGNUP_INTENT,
  SIGNUP_INTENT_KEY,
  SOFTWARE_NOTE,
  SW_SIM,
  SW_SIM_CONFIG,
  WHAT_YOU_GET,
  WHO_FOR,
  formatInr,
  moduleLabel,
  swSimPlans,
  totalHours,
  type SwSimLesson,
  type SwSimModule,
  type SwSimPlan,
} from "@/content/swSimulation";
import { NotifyForm } from "./NotifyForm";
import { HeroDiagram } from "./HeroDiagram";
import "@/styles/cards.css";
import "../Launch/launch.css";
import "./sw-simulation.css";

type Interest = "level1" | "level2" | "combo" | "team" | "";

const FIRST_FREE_LESSON = "M1.1";
const lessonPath = (code: string) => `${SW_SIM.classroomPath}/${encodeURIComponent(code)}`;

/** Live lesson rows from the database, by lesson code. Missing tables/rows → the content file alone. */
function useLiveSyllabus() {
  const { data } = useCachedData(`lessons:syllabus:${SW_SIM_CONFIG.courseSlugs.level1}`, async () => {
    try {
      return await getCourseSyllabus(SW_SIM_CONFIG.courseSlugs.level1);
    } catch (err) {
      console.warn("sw-simulation: syllabus not available from the database yet", err);
      return null;
    }
  });
  return useMemo(() => {
    const modules = new Map<string, ModuleWithLessons>();
    for (const m of data ?? []) if (m.code) modules.set(m.code, m);
    return modules;
  }, [data]);
}

function courseJsonLd() {
  const url = absoluteUrl(SW_SIM.path);
  const plans = swSimPlans().filter((p) => p.price !== null);
  const freeModules = LEVEL1_MODULES.filter((m) => m.free);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: SW_SIM.name,
    description: SW_SIM.seoDescription,
    url,
    image: absoluteUrl(SW_SIM.ogImage),
    provider: { "@type": "EducationalOrganization", "@id": `${SITE_URL}/#organization`, name: BUSINESS.name, url: `${SITE_URL}/` },
    inLanguage: "en",
    educationalLevel: "Intermediate",
    teaches: "Linear static FEA in SOLIDWORKS Simulation, hand-calculation validation, mesh convergence, validation reports",
    coursePrerequisites: "SOLIDWORKS part/assembly skills and diploma/BE-level strength of materials",
    isAccessibleForFree: false,
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: p.title,
      category: "Paid",
      price: p.price,
      priceCurrency: SW_SIM_CONFIG.currency,
      url,
      availability: p.purchasable ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
    })),
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: "Online",
        courseWorkload: `PT${totalHours(LEVEL1_MODULES)}H`,
        inLanguage: "en",
      },
    ],
    // Module 0 and Module 1 are free with an account.
    hasPart: freeModules.map((m) => ({
      "@type": "LearningResource",
      name: `${moduleLabel(m.code)}: ${m.title}`,
      isAccessibleForFree: true,
      timeRequired: `PT${m.hours}H`,
      url: absoluteUrl(lessonPath(m.lessons[0]?.code ?? FIRST_FREE_LESSON)),
    })),
  };
}

export default function SwSimulationPage() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const live = useLiveSyllabus();
  const [interest, setInterest] = useState<Interest>("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const signedIn = Boolean(session);
  const plans = swSimPlans();

  useEffect(() => {
    trackViewContent({ name: SW_SIM.name, id: SW_SIM_CONFIG.slug, value: plans[0].price });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);

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
    const el = document.getElementById("notify");
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    document.getElementById("notify-name")?.focus({ preventScroll: true });
  }

  async function enrol(plan: SwSimPlan) {
    setCheckoutError(null);
    if (!signedIn) {
      navigate("/login", { state: { from: { pathname: SW_SIM.path } } });
      return;
    }
    setCheckoutBusy(plan.product);
    trackBeginCheckout({ name: plan.title, id: plan.courseSlug, value: plan.price });
    try {
      const result = await startCourseCheckoutBySlug(plan.courseSlug, {
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

  const tierLabel = SW_SIM_CONFIG.activePriceTier === "foundingBatch" ? "Founding batch" : SW_SIM_CONFIG.activePriceTier === "launch" ? "Launch price" : "Price";
  const seats = SW_SIM_CONFIG.prices[SW_SIM_CONFIG.activePriceTier]?.seats;

  return (
    <div className="launch sws">
      <Seo
        title={SW_SIM.seoTitle}
        description={SW_SIM.seoDescription}
        image={SW_SIM.ogImage}
        canonical={SW_SIM.path}
        breadcrumbs={[
          { name: "Courses", path: "/courses" },
          { name: "SOLIDWORKS Simulation", path: SW_SIM.path },
        ]}
        jsonLd={[courseJsonLd(), faqSchema(FAQS)].filter((x): x is Record<string, unknown> => x !== null)}
      />

      {/* 1. Hero */}
      <section className="launch-hero sws-hero">
        <div className="launch-hero__bg blueprint-grid" aria-hidden="true" />
        <div className="container launch-hero__inner sws-hero__inner">
          <div className="launch-hero__copy">
            <span className="launch-tag">{SW_SIM.badge}</span>
            <h1 className="launch-hero__title sws-hero__title">{SW_SIM.name}</h1>
            <p className="launch-hero__sub">{SW_SIM.subtitle}</p>
            <ul className="launch-chips">
              <li className="launch-chips__accent">Module 0 + 1 free</li>
              <li>{totalHours(LEVEL1_MODULES)} h · Level 1</li>
              <li>Recorded + weekend live doubts</li>
              <li>SOLIDWORKS 2020+</li>
            </ul>
            <div className="launch-hero__ctas">
              <Link to={lessonPath(FIRST_FREE_LESSON)} className="btn btn--primary launch-hero__cta" onClick={(e) => startFree(e)}>
                Start Module 1 free
              </Link>
              <a href="#syllabus" className="btn btn--outline sws-hero__secondary">
                See full syllabus
              </a>
            </div>
          </div>
          <HeroDiagram />
        </div>
      </section>

      {/* 2. Who it is for */}
      <section className="section container sws-narrow" aria-labelledby="sws-who">
        <span className="mono-label">Who it is for</span>
        <h2 className="launch-h2" id="sws-who">
          Working design engineers who already use SOLIDWORKS
        </h2>
        <p className="sws-lead">{WHO_FOR}</p>
      </section>

      {/* 3. What makes it different */}
      <section className="section launch-band" aria-labelledby="sws-diff">
        <div className="container">
          <span className="mono-label">Method</span>
          <h2 className="launch-h2" id="sws-diff">
            What makes it different
          </h2>
          <div className="launch-cards">
            {DIFFERENT.map((d, i) => (
              <article className="launch-card drafting-frame" key={d.title}>
                <span className="launch-card__num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Syllabus */}
      <section className="section container launch-anchor" id="syllabus" aria-labelledby="sws-syllabus">
        <span className="mono-label">Syllabus</span>
        <h2 className="launch-h2" id="sws-syllabus">
          Full syllabus
        </h2>

        <div className="sws-level">
          <h3 className="sws-level__title">
            Level 1 — Foundation: Linear Static Analysis of Parts <span className="sws-level__hours">{totalHours(LEVEL1_MODULES)} h</span>
          </h3>
          <div className="sws-modules">
            {LEVEL1_MODULES.map((m, i) => (
              <ModuleItem key={m.code} module={m} live={live.get(m.code)} defaultOpen={i === 1} signedIn={signedIn} onStart={startFree} />
            ))}
          </div>
        </div>

        <div className="sws-level">
          <h3 className="sws-level__title">
            Level 2 — Professional <span className="sws-badge sws-badge--muted">Coming soon</span>
          </h3>
          <div className="sws-modules">
            {LEVEL2_MODULES.map((m) => (
              <ModuleItem key={m.code} module={m} signedIn={signedIn} onStart={startFree} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. What you get */}
      <section className="section launch-band" aria-labelledby="sws-get">
        <div className="container">
          <span className="mono-label">Included</span>
          <h2 className="launch-h2" id="sws-get">
            What you get
          </h2>
          <ul className="sws-get">
            {WHAT_YOU_GET.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Pricing */}
      <section className="section container launch-anchor" id="pricing" aria-labelledby="sws-pricing">
        <span className="mono-label">{tierLabel}</span>
        <h2 className="launch-h2" id="sws-pricing">
          Pricing
        </h2>
        {SW_SIM_CONFIG.activePriceTier === "foundingBatch" && seats && (
          <p className="sws-lead">Founding-batch prices for the first {seats} learners. Module 0 and Module 1 stay free for everyone.</p>
        )}
        {checkoutError && (
          <p className="field__error" role="alert">
            {checkoutError}
          </p>
        )}
        <div className="sws-plans">
          {plans.map((plan) => (
            <article className={`sws-plan drafting-frame${plan.product === "combo" ? " sws-plan--best" : ""}`} key={plan.product}>
              <h3 className="sws-plan__title">{plan.title}</h3>
              <p className="sws-plan__blurb">{plan.blurb}</p>
              <p className="sws-plan__price">
                {plan.price !== null ? formatInr(plan.price) : <span className="sws-plan__soon">Coming soon</span>}
              </p>
              {plan.price !== null && <p className="sws-plan__gst">{SW_SIM_CONFIG.gstNote}</p>}
              {plan.purchasable ? (
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  disabled={checkoutBusy !== null}
                  onClick={() => enrol(plan)}
                >
                  {checkoutBusy === plan.product
                    ? "Opening checkout…"
                    : plan.product === "combo" && SW_SIM_CONFIG.level2Status === "coming-soon"
                      ? `Pre-order — ${formatInr(plan.price!)}`
                      : `Enrol — ${formatInr(plan.price!)}`}
                </button>
              ) : (
                <button type="button" className="btn btn--outline btn--block" onClick={() => joinWaitlist(plan.product)}>
                  {plan.comingSoon ? "Notify me" : "Join the founding batch waitlist"}
                </button>
              )}
            </article>
          ))}
        </div>
        <p className="launch-price__note">
          GST invoice with every paid purchase. Teams of 5 or more: choose “Team” in the form below.{" "}
          <Link to="/refund-policy">Refund policy</Link>
        </p>
      </section>

      {/* 7. Software */}
      <section className="section launch-band" aria-labelledby="sws-software">
        <div className="container sws-narrow">
          <span className="mono-label">Software</span>
          <h2 className="launch-h2" id="sws-software">
            Software you need
          </h2>
          <ul className="sws-software">
            <li>
              <strong>Level 1:</strong> {SOFTWARE_NOTE.level1}
            </li>
            <li>
              <strong>Level 2:</strong> {SOFTWARE_NOTE.level2}
            </li>
            <li>
              <strong>Version:</strong> {SOFTWARE_NOTE.version}
            </li>
          </ul>
        </div>
      </section>

      {/* 8. FAQ */}
      <section className="section container launch-faq launch-anchor" id="faq" aria-labelledby="sws-faq">
        <span className="mono-label">FAQ</span>
        <h2 className="launch-h2" id="sws-faq">
          Questions
        </h2>
        <div className="sws-faq">
          {FAQS.map((item) => (
            <details className="sws-faq__item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 9. Notify me */}
      <section className="section container launch-anchor" id="notify" aria-labelledby="sws-notify">
        <div className="launch-split">
          <div>
            <span className="mono-label">Notify me</span>
            <h2 className="launch-h2" id="sws-notify">
              Get told first when enrollment opens
            </h2>
            <p className="sws-lead">
              Founding-batch seats go to the waitlist first. Companies enrolling a team of 5 or more get a discounted team licence — choose
              “Team”.
            </p>
          </div>
          <div className="launch-form-card drafting-frame">
            <NotifyForm interest={interest} onInterestChange={setInterest} />
          </div>
        </div>
      </section>

      {/* 10. Final CTA */}
      <section className="sws-final">
        <div className="container sws-final__inner">
          <h2 className="sws-final__title">Module 0 and Module 1 are free. Start with the cantilever.</h2>
          <Link to={lessonPath(FIRST_FREE_LESSON)} className="btn btn--primary launch-hero__cta" onClick={(e) => startFree(e)}>
            Start Module 1 free
          </Link>
        </div>
      </section>

      <div className="launch-sticky" role="region" aria-label="Quick actions">
        <Link to={lessonPath(FIRST_FREE_LESSON)} className="btn btn--primary" onClick={(e) => startFree(e)}>
          Start Module 1 free
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ModuleItem({
  module,
  live,
  defaultOpen = false,
  signedIn,
  onStart,
}: {
  module: SwSimModule;
  live?: ModuleWithLessons;
  defaultOpen?: boolean;
  signedIn: boolean;
  onStart: (e: MouseEvent<HTMLAnchorElement>, code: string) => void;
}) {
  // The database decides what's released; the content file is the fallback.
  const released = live ? live.is_released : module.released;
  const free = live ? live.is_free : module.free;
  const releaseLabel = live?.release_label ?? module.releaseLabel;
  const liveLessons = new Map((live?.course_lessons ?? []).map((l) => [l.code, l]));
  const label = moduleLabel(module.code);

  return (
    <details className="sws-module" open={defaultOpen}>
      <summary className="sws-module__summary">
        <span className="sws-module__code">{label}</span>
        <span className="sws-module__title">{module.title}</span>
        <span className="sws-module__meta">
          {free && <span className="sws-badge">Free</span>}
          {!released && (
            <span className="sws-badge sws-badge--muted">{releaseLabel ? `Coming soon · ${releaseLabel}` : "Coming soon"}</span>
          )}
          {module.hours !== null && <span className="sws-module__hours">{module.hours} h</span>}
        </span>
      </summary>
      {module.lessons.length > 0 ? (
        <ol className="sws-lessons">
          {module.lessons.map((lesson) => (
            <LessonRowItem
              key={lesson.code}
              lesson={lesson}
              playable={released && Boolean(liveLessons.get(lesson.code)?.is_published)}
              free={free}
              signedIn={signedIn}
              onStart={onStart}
            />
          ))}
        </ol>
      ) : (
        <p className="sws-module__empty">Lessons are listed when this module is released.</p>
      )}
    </details>
  );
}

function LessonRowItem({
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
