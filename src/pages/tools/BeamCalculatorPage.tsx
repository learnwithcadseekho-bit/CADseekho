import { useEffect, useRef, useState } from "react";
import { Seo } from "@/components/Seo";
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

export default function BeamCalculatorPage() {
  return (
    <>
      <Seo
        title="Free Beam Calculator – SFD, BMD & Deflection"
        description="Free online beam calculator: support reactions, shear force and bending moment diagrams, deflection, bending and shear stress for any supports, loads and cross-section, including ISMB I-beams."
        canonical="https://cadseekho.com/tools/beam-calculator"
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
    </>
  );
}
