import { useEffect, useRef, useState } from "react";
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
  nextMilestone,
} from "@/content/launch";
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
      answer: `Classes are live online at 8:00 PM IST. The free demo is on ${istDay(LAUNCH.demoStart)} at 8:00 PM and the batch starts ${istDay(LAUNCH.batchStart)} at 8:00 PM.`,
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
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    trackViewContent({ name: LAUNCH.courseName, id: course?.id, value: LAUNCH.price });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit to the page
  }, []);

  const description =
    `Live online ANSYS Workbench course for beginners — batch starts ${istDay(LAUNCH.batchStart)}, 8 PM IST. ` +
    `Free demo class ${istDay(LAUNCH.demoStart)}. Launch price ${PRICE_LABEL}, recordings included.`;
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

      {/* 1. Hero */}
      <section className="launch-hero">
        <div className="launch-hero__bg blueprint-grid" aria-hidden="true" />
        <div className="container launch-hero__inner">
          <div className="launch-hero__copy">
            <span className="mono-label">New live batch · Beginner friendly</span>
            <h1 className="launch-hero__title">ANSYS Workbench Foundation — Live Online</h1>
            <p className="launch-hero__sub">Know CAD but not simulation? Learn ANSYS from zero.</p>
            <ul className="launch-chips" aria-label="Batch details">
              <li>Batch starts {istDay(LAUNCH.batchStart)} · 8 PM IST</li>
              <li className="launch-chips__accent">{PRICE_LABEL} launch offer</li>
              <li>Recordings included</li>
              <li>Limited seats</li>
            </ul>
            <div className="launch-hero__ctas">
              <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
                Book free demo
              </button>
              <a href={LAUNCH_WHATSAPP_URL} className="btn btn--outline" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> WhatsApp us
              </a>
            </div>
          </div>
          <HeroVideo />
        </div>
      </section>

      {/* 2. Countdown */}
      <Countdown />

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

      {/* 5. Schedule + inline booking form */}
      <section className="section container launch-split launch-anchor" id="demo">
        {/* Old anchor, kept in case a live ad or link still uses it. */}
        <div id="book-demo" className="launch-anchor">
          <span className="mono-label">Schedule</span>
          <h2 className="launch-h2">Dates</h2>
          <ol className="launch-schedule">
            <li>
              <span className="launch-schedule__date">{istDay(LAUNCH.demoStart)}</span>
              <span>
                <strong>Free demo class</strong> · 8:00 PM IST on Zoom
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
                <strong>Batch starts</strong> · 8:00 PM IST
              </span>
            </li>
          </ol>
        </div>
        <div className="launch-form-card drafting-frame">
          <h2 className="launch-h2 launch-h2--sm">Book your free demo seat</h2>
          <DemoForm idPrefix="inline" />
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
              {course?.original_price != null && course.original_price > LAUNCH.price && (
                <s className="launch-price__was">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                    course.original_price
                  )}
                </s>
              )}
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
        <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
          Book free demo
        </button>
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

      {modalOpen && <DemoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * The ad video, muted and looping. The prerendered HTML has only the poster;
 * the video source is attached after the page has loaded, so it never
 * competes with the first paint. Skipped when the visitor asks for reduced
 * motion or data.
 */
function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saveData) return;
    const attach = () => setSrc(LAUNCH.video.src);
    if (document.readyState === "complete") {
      const id = window.setTimeout(attach, 300);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", attach, { once: true });
    return () => window.removeEventListener("load", attach);
  }, []);

  useEffect(() => {
    if (src) ref.current?.play().catch(() => {});
  }, [src]);

  return (
    <div className="launch-video">
      <video
        ref={ref}
        src={src ?? undefined}
        poster={LAUNCH.video.poster}
        width={LAUNCH.video.width}
        height={LAUNCH.video.height}
        muted
        loop
        playsInline
        autoPlay
        preload="none"
        aria-label="ANSYS Workbench Foundation course preview"
      />
    </div>
  );
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
    <section className="launch-countdown" aria-live="off">
      <div className="container launch-countdown__inner">
        {now === null ? (
          <p className="launch-countdown__label">
            Free demo: {istDay(LAUNCH.demoStart)}, 8 PM IST · Batch starts {istDay(LAUNCH.batchStart)}
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
    </section>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="launch-modal"
      aria-labelledby="demo-modal-title"
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop (outside the panel) closes it.
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="launch-modal__panel">
        <div className="launch-modal__head">
          <h2 id="demo-modal-title" className="launch-h2 launch-h2--sm">
            Book your free demo seat
          </h2>
          <button type="button" className="launch-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <DemoForm idPrefix="modal" />
      </div>
    </dialog>
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
