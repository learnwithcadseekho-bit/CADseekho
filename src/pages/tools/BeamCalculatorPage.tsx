import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { absoluteUrl } from "@/config/site";
import { faqSchema, ORGANIZATION_ID } from "@/lib/schema";
import "@/styles/cards.css";
import "@/styles/resources.css";
import "./tools.css";

const TOOL_SRC = "/tools/beam-calculator.html?embed=1";
const HEIGHT_MESSAGE = "cadseekho-tool-height";
const FALLBACK_HEIGHT = 1600;

// The calculator is a self-contained static page (public/tools/beam-calculator.html).
// In embed mode it hides its own header/footer and posts its content height, so
// the iframe can be sized to fit with no inner scrollbar.
function ToolFrame({ src, title }: { src: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (data?.type !== HEIGHT_MESSAGE || typeof data.height !== "number" || !(data.height > 0)) return;
      setHeight(Math.ceil(data.height));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      className="tool-frame"
      style={height ? { height } : { minHeight: FALLBACK_HEIGHT }}
    />
  );
}

const FAQS = [
  {
    question: "What does the beam calculator compute?",
    answer:
      "Support reactions, shear force and bending moment diagrams (SFD and BMD), the location and value of peak moment, and — in 3D mode with a cross-section and material — deflection, bending and shear stress, factor of safety and an L/δ deflection check.",
  },
  {
    question: "Which supports and loads can I use?",
    answer:
      "Pin, roller and fixed supports placed anywhere along the span, and any combination of point loads, uniformly distributed loads (UDL), linearly varying loads and applied moments — so simply supported, cantilever, overhanging, propped and continuous beams are all covered.",
  },
  {
    question: "Which cross-sections are available?",
    answer:
      "Rectangular, rectangular hollow (RHS), circular, circular hollow (CHS), I-sections including Indian standard ISMB 100–600, T-sections and channels, plus custom dimensions.",
  },
  {
    question: "How accurate is it?",
    answer:
      "The solver uses beam finite elements and is checked against textbook formulas, and the tool shows a hand-calculation check beside the result so you can see where the numbers come from.",
  },
  {
    question: "Is it free? Do I need to sign in?",
    answer: "Yes, it's free and needs no sign-in.",
  },
];

export default function BeamCalculatorPage() {
  return (
    <>
      <Seo
        title="Free Beam Calculator – SFD, BMD & Deflection | CADseekho"
        description="Free online beam calculator: support reactions, shear force and bending moment diagrams, deflection, bending and shear stress for any supports and loads, incl. ISMB."
        canonical="/tools/beam-calculator"
        breadcrumbs={[
          { name: "Resources", path: "/resources" },
          { name: "Beam Calculator", path: "/tools/beam-calculator" },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "CADseekho Beam Calculator",
            url: absoluteUrl("/tools/beam-calculator"),
            applicationCategory: "EngineeringApplication",
            operatingSystem: "Any (web browser)",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: 0, priceCurrency: "INR" },
            provider: { "@type": "EducationalOrganization", "@id": ORGANIZATION_ID, name: "CADseekho" },
          },
          faqSchema(FAQS)!,
        ]}
      />
      <header className="resources-hero container">
        <span className="mono-label">Free tool</span>
        <h1 className="resources-hero__title">Beam Calculator</h1>
        <p className="resources-hero__lead">
          Reactions, SFD, BMD, deflection and stress — solve by hand first, validate here.
        </p>
      </header>

      {/* TODO(auth): the route is public for now. If the 3D (with profile) mode
          needs a login later, gate only that mode: read the Supabase session here
          (useAuth) and pass it to the tool, e.g. a `&locked3d=1` query param or a
          postMessage, so the calculator can show a sign-in prompt on its 3D tab.
          Keep 2D open and don't wrap this whole page in ProtectedRoute. */}
      <section className="tool-section container">
        <ToolFrame src={TOOL_SRC} title="Beam calculator" />
      </section>

      <section className="tool-guide container">
        <h2>What this beam calculator does</h2>
        <p>
          Enter a span, place supports and add loads, and the calculator returns the support reactions and
          the full shear force and bending moment diagrams, with the peak bending moment and where it occurs.
          Switch to <strong>3D · With profile</strong>, pick a cross-section and material, and it adds
          deflection, bending and shear stress, factor of safety and a deflection-limit check (L/180 to L/500).
        </p>

        <h2>How to use it</h2>
        <ol>
          <li>Set the beam length and add supports — pin, roller or fixed — at any position.</li>
          <li>Add point loads, UDLs, linearly varying loads or moments.</li>
          <li>Read the reactions, SFD and BMD, and the SF &amp; BM values at key points.</li>
          <li>
            For stress and deflection, choose 3D mode, a section (rectangular, RHS, circular, CHS, ISMB I-beam,
            T or channel) and a material, or enter E, yield strength and density yourself.
          </li>
        </ol>

        <h2>Solve by hand first, then validate</h2>
        <p>
          The calculator shows a hand-calculation check next to every result, so you can follow the
          equilibrium equations and standard beam formulas instead of trusting a black box. That is the same
          method we teach in our{" "}
          <Link to="/courses/ansys-workbench-level-1">ANSYS Workbench course</Link>: estimate the answer with
          the right formula, build the model in simulation software, and compare. For holes and notches, use
          the <Link to="/resources/plate-with-hole-stress-concentration-calculator">plate-with-a-hole Kt calculator</Link>.
        </p>

        <h2>Frequently asked questions</h2>
        <div className="tool-faq">
          {FAQS.map((f) => (
            <details key={f.question}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
