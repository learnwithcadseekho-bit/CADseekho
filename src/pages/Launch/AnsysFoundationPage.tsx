import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";
import { useCachedData } from "@/hooks/useCachedData";
import { getCourseDetailBySlug } from "@/services/courseService";
import { trackViewContent } from "@/lib/track";
import { faqSchema } from "@/lib/schema";
import { absoluteUrl, BUSINESS, SITE_URL } from "@/config/site";
import { responsiveImage } from "@/utils/imageUrl";
import {
  LAUNCH,
  LAUNCH_ENROLL_PATH,
  LAUNCH_WHATSAPP_URL,
  PRICE_LABEL,
  istDay,
  istTime,
  istTimeShort,
  nextMilestone,
} from "@/content/launch";
import { AdVideo } from "./AdVideo";
import { DemoForm } from "./DemoForm";
import "@/styles/cards.css";
import "./launch.css";

const TOPIC_CARDS: { title: string; body: string }[] = [
  { title: "Static structural", body: "Loads, supports and contacts on real parts — read stress and deformation and know when to trust them." },
  { title: "Thermal", body: "Steady-state heat transfer: temperatures and heat flow through parts and assemblies." },
  { title: "Modal", body: "Natural frequencies and mode shapes, so a design doesn't resonate in service." },
  { title: "Buckling", body: "Eigenvalue buckling for slender members — the failure a stress check alone misses." },
  { title: "Design optimization", body: "Parameters and response surfaces to find a lighter, stronger design instead of guessing." },
];

// Line icons, 24px, drawn in currentColor.
const DEMO_POINTS: { text: string; icon: ReactNode }[] = [
  {
    text: "Import a real bracket and mesh it",
    icon: (
      <>
        <path d="M4 4h6v10h10v6H4z" />
        <path d="M4 9h6M4 14h6M10 14v6M15 14v6M7 4v16" />
      </>
    ),
  },
  {
    text: "Apply loads & supports, solve live",
    icon: (
      <>
        <path d="M12 3v10M8 9l4 4 4-4" />
        <path d="M4 17h16" />
        <path d="M6 17l-2 4M10 17l-2 4M14 17l-2 4M18 17l-2 4" />
      </>
    ),
  },
  {
    text: "Read stress & deformation results",
    icon: (
      <>
        <path d="M4 20V4" />
        <path d="M4 20h16" />
        <path d="M8 16v-4M12 16V8M16 16v-6" />
      </>
    ),
  },
  {
    text: "Ask your doubts live + course roadmap",
    icon: (
      <>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M10 9.5a2 2 0 1 1 2.5 1.9c-.4.1-.5.4-.5.8" />
        <path d="M12 14.2v.1" />
      </>
    ),
  },
];

const HOW_IT_WORKS: { title: string; body: string }[] = [
  { title: "Live at 8 PM IST", body: "Instructor-led classes on Zoom in the evening, after college or work. Ask questions as you go." },
  { title: "Every class recorded", body: "Missed one or want to rewatch a setup? The recording of each class is included." },
  { title: "Real engineering parts", body: "Brackets, beams and plates like the ones you'd analyse at work — not abstract textbook shapes." },
  { title: "Doubt support", body: "Stuck on a mesh or an error? Get your doubts cleared between classes too." },
];

function faqItems() {
  return [
    {
      question: "Are the classes recorded?",
      answer: "Yes. Every live class is recorded and the recordings are included, so you can catch up on a missed class or rewatch a setup.",
    },
    {
      question: "What are the class timings?",
      answer: `Classes are live online at 8:00 PM IST. The free demo is on ${istDay(LAUNCH.demoStart)} at ${istTime(LAUNCH.demoStart)} IST and the batch starts ${istDay(LAUNCH.batchStart)} at 8:00 PM.`,
    },
    {
      question: "Which ANSYS version do I need?",
      answer: "The free ANSYS Student version is enough for this course. We help you install it before the classes start.",
    },
    {
      question: "Do I need any prior experience?",
      answer: "Basic CAD is enough — if you can model a simple part in SolidWorks, Creo, CATIA or similar, you're ready. No simulation experience needed; we start from zero.",
    },
    {
      question: "What is the refund policy?",
      answer: "Please see our refund policy page, or message us on WhatsApp before you pay if you have any questions.",
    },
  ];
}

function courseJsonLd(description: string) {
  const url = absoluteUrl(LAUNCH.path);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${LAUNCH.courseName} — Live Online`,
    description,
    url,
    provider: { "@type": "EducationalOrganization", "@id": `${SITE_URL}/#organization`, name: BUSINESS.name, url: `${SITE_URL}/` },
    educationalLevel: "Beginner",
    teaches: LAUNCH.topics.join(", "),
    inLanguage: "en-IN",
    offers: {
      "@type": "Offer",
      category: "Paid",
      price: LAUNCH.price,
      priceCurrency: LAUNCH.currency,
      url,
      availability: "https://schema.org/InStock",
      priceValidUntil: LAUNCH.offerEnds.slice(0, 10),
    },
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: "Online",
        startDate: LAUNCH.batchStart.slice(0, 10),
      },
    ],
  };
}

export default function AnsysFoundationPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  // Live course row: testimonials and the course id for tracking. The launch facts themselves are in content/launch.ts.
  const { data: course } = useCachedData(`course:${LAUNCH.courseSlug}`, () => getCourseDetailBySlug(LAUNCH.courseSlug));

  useEffect(() => {
    trackViewContent({ name: LAUNCH.courseName, id: course?.id, value: LAUNCH.price });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit to the page
  }, []);

  const description =
    `Live online ANSYS Workbench course for beginners — batch starts ${istDay(LAUNCH.batchStart)}, 8 PM IST. ` +
    `Free demo class ${istDay(LAUNCH.demoStart)}, ${istTime(LAUNCH.demoStart)} IST. Launch price ${PRICE_LABEL}, recordings included.`;
  const faqs = faqItems();
  const testimonials = course?.course_testimonials ?? [];

  return (
    <div className="launch">
      <Seo
        title="ANSYS Workbench Foundation Course — Live Online | CADseekho"
        description={description}
        image={course?.image ?? undefined}
        canonical={LAUNCH.path}
        breadcrumbs={[
          { name: "Courses", path: "/courses" },
          { name: LAUNCH.courseName, path: LAUNCH.path },
        ]}
        jsonLd={[courseJsonLd(description), faqSchema(faqs)].filter((x): x is Record<string, unknown> => x !== null)}
      />

      {/* 1. Hero — the free demo is the offer here; the paid batch is sold further down. */}
      <section className="launch-hero">
        <div className="launch-hero__bg blueprint-grid" aria-hidden="true" />
        <div className="container launch-hero__inner">
          <div className="launch-hero__copy">
            <span className="launch-tag">Free live demo</span>
            <h1 className="launch-hero__title">
              Free ANSYS Demo Class —{" "}
              <span className="launch-nowrap">
                {istDay(LAUNCH.demoStart).replace(",", "")}, {istTimeShort(LAUNCH.demoStart)}
              </span>
            </h1>
            <p className="launch-hero__sub">
              {LAUNCH.demoMinutes} min live on Zoom · See a real simulation solved step by step · No cost
            </p>
            <Countdown />
            <div className="launch-hero__ctas">
              <a href="#demo" className="btn btn--primary launch-hero__cta" onClick={goToForm}>
                Book My Free Seat
              </a>
              <a href={LAUNCH_WHATSAPP_URL} className="launch-hero__wa" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Or WhatsApp us
              </a>
            </div>
          </div>
          {/* After the CTA in the DOM, so on phones it sits below the fold and never pushes the button down. */}
          <AdVideo autoplay />
        </div>
      </section>

      {/* 2. What the demo covers */}
      <section className="section container launch-see" aria-labelledby="see-title">
        <span className="mono-label">{LAUNCH.demoMinutes}-minute live session</span>
        <h2 className="launch-h2" id="see-title">
          What you'll see in the free demo
        </h2>
        <ul className="launch-see__list">
          {DEMO_POINTS.map((p) => (
            <li key={p.text}>
              <svg
                className="launch-see__icon"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                {p.icon}
              </svg>
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Inline booking form + dates (#demo is also an Ads sitelink) */}
      <section className="section container launch-split launch-form-section launch-anchor" id="demo">
        <div className="launch-form-card drafting-frame">
          <h2 className="launch-h2 launch-h2--sm">Reserve your free seat</h2>
          <DemoForm idPrefix="inline" />
        </div>
        {/* Old anchor, kept in case a live ad or link still uses it. */}
        <div id="book-demo" className="launch-anchor">
          <span className="mono-label">Schedule</span>
          <h2 className="launch-h2">Dates</h2>
          <ol className="launch-schedule">
            <li>
              <span className="launch-schedule__date">{istDay(LAUNCH.demoStart)}</span>
              <span>
                <strong>Free demo class</strong> · {istTime(LAUNCH.demoStart)} IST on Zoom
              </span>
            </li>
            <li>
              <span className="launch-schedule__date">{istDay(LAUNCH.offerEnds)}</span>
              <span>
                <strong>Launch offer ends</strong> · 11:59 PM IST
              </span>
            </li>
            <li>
              <span className="launch-schedule__date">{istDay(LAUNCH.batchStart)}</span>
              <span>
                <strong>Batch starts</strong> · 8:00 PM IST · {PRICE_LABEL}
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* 3. What you'll learn */}
      <section className="section container launch-anchor" id="syllabus">
        <span className="mono-label">Curriculum</span>
        <h2 className="launch-h2">What you'll learn</h2>
        <div className="launch-cards">
          {TOPIC_CARDS.map((t, i) => (
            <article className="launch-card drafting-frame" key={t.title}>
              <span className="launch-card__num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
            </article>
          ))}
        </div>
        {course && course.course_modules.length > 0 && (
          <p className="launch-more">
            Full module-by-module syllabus on the <Link to={`/courses/${LAUNCH.courseSlug}`}>course page →</Link>
          </p>
        )}
      </section>

      {/* 4. How it works */}
      <section className="section launch-band">
        <div className="container">
          <span className="mono-label">Format</span>
          <h2 className="launch-h2">How it works</h2>
          <div className="launch-how">
            {HOW_IT_WORKS.map((h) => (
              <div className="launch-how__item" key={h.title}>
                <h3>{h.title}</h3>
                <p>{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Instructor — only once there's a real bio (content/launch.ts). */}
      {LAUNCH.instructor && (
        <section className="section container">
          <span className="mono-label">Instructor</span>
          <h2 className="launch-h2">{LAUNCH.instructor.name}</h2>
          <p className="launch-instructor">{LAUNCH.instructor.bio}</p>
        </section>
      )}

      {/* 7. Testimonials — the course's real ones from the database. */}
      {testimonials.length > 0 && (
        <section className="section container">
          <span className="mono-label">Students</span>
          <h2 className="launch-h2">What past students say</h2>
          <div className="testimonial-list launch-testimonials">
            {testimonials.map((t) => (
              <blockquote className="testimonial-card" key={t.id}>
                {t.student_photo ? (
                  <img
                    {...responsiveImage(t.student_photo, 48)}
                    width={48}
                    height={48}
                    alt={t.student_name}
                    className="testimonial-card__photo"
                    loading="lazy"
                    decoding="async"
                  />
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
        </section>
      )}

      {/* 8. Pricing */}
      <section className="section container launch-anchor" id="fees">
        <div className="launch-price drafting-frame launch-anchor" id="pricing">
          <span className="mono-label">Launch offer</span>
          <h2 className="launch-h2">{LAUNCH.courseName}</h2>
          {!isAdmin && (
            <p className="launch-price__amount">
              {PRICE_LABEL}
            </p>
          )}
          <p className="launch-price__ends">Offer ends {istDay(LAUNCH.offerEnds)}, 11:59 PM IST</p>
          <ul className="launch-price__list">
            <li>Live classes at 8 PM IST from {istDay(LAUNCH.batchStart)}</li>
            <li>Recordings of every class</li>
            <li>{LAUNCH.topics.join(", ")}</li>
            <li>Doubt support</li>
          </ul>
          <Link to={LAUNCH_ENROLL_PATH} className="btn btn--primary btn--block">
            {isAdmin ? "Open course (admin)" : `Pay & enroll — ${PRICE_LABEL}`}
          </Link>
          <p className="launch-price__note">
            Secure payment by Razorpay (UPI, cards, net banking). You'll sign in or create an account first.{" "}
            <Link to="/refund-policy">Refund policy</Link>
          </p>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="section container launch-faq launch-anchor" id="faq">
        <span className="mono-label">FAQ</span>
        <h2 className="launch-h2">Questions</h2>
        <div className="faq-list">
          {faqs.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary className="faq-item__question">{item.question}</summary>
              <p className="faq-item__answer">
                {item.question === "What is the refund policy?" ? (
                  <>
                    Please see our <Link to="/refund-policy">refund policy</Link>, or{" "}
                    <a href={LAUNCH_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      message us on WhatsApp
                    </a>{" "}
                    before you pay if you have any questions.
                  </>
                ) : (
                  item.answer
                )}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* 10. Sticky mobile bar */}
      <div className="launch-sticky" role="region" aria-label="Quick actions">
        <a href="#demo" className="btn btn--primary" onClick={goToForm}>
          Book My Free Seat
        </a>
        <a
          href={LAUNCH_WHATSAPP_URL}
          className="launch-sticky__wa"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp us"
        >
          <WhatsAppIcon />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** "Book My Free Seat": scroll to the inline form and put the cursor in Name. Works as a plain #demo link without JS. */
function goToForm(e: MouseEvent<HTMLAnchorElement>) {
  const form = document.getElementById("demo");
  if (!form) return;
  e.preventDefault();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  document.getElementById("inline-name")?.focus({ preventScroll: true });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Counts down in real time (IST instants); the prerendered HTML shows the dates only. */
function Countdown() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const target = now === null ? null : nextMilestone(now);
  const left = target && now !== null ? Math.max(0, target.at - now) : 0;
  const parts = [
    { label: "days", value: Math.floor(left / 86_400_000) },
    { label: "hrs", value: Math.floor(left / 3_600_000) % 24 },
    { label: "min", value: Math.floor(left / 60_000) % 60 },
    { label: "sec", value: Math.floor(left / 1000) % 60 },
  ];

  return (
    <div className="launch-countdown" aria-live="off">
      {now === null ? (
        <p className="launch-countdown__label">
          Free demo: {istDay(LAUNCH.demoStart)}, {istTime(LAUNCH.demoStart)} IST · Batch starts {istDay(LAUNCH.batchStart)}
        </p>
      ) : target ? (
        <>
          <p className="launch-countdown__label">{target.label}</p>
          <div className="launch-countdown__clock" role="timer">
            {parts.map((p) => (
              <span key={p.label}>
                <strong>{pad(p.value)}</strong>
                <small>{p.label}</small>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="launch-countdown__label">Next batch coming soon — WhatsApp us to get notified.</p>
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.24 8.24 0 1 1 7 3.86Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.28Z"
      />
    </svg>
  );
}
