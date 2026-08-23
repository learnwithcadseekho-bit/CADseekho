import { useRef, useState } from "react";
import { Seo } from "@/components/Seo";

const SRC = "/blog-source/minimum-hole-diameter-design-guide.html";
const FILENAME = "minimum-hole-diameter-design-guide.html";

// This post ships as a self-contained HTML/CSS file with its own design
// language, kept verbatim (see public/blog-source/). An iframe renders it
// with zero collision against the site's global CSS, instead of running it
// through the sanitized rich-content pipeline other posts use.
export default function MinimumHoleDiameterPost() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1200);

  function handleLoad() {
    const doc = iframeRef.current?.contentWindow?.document;
    if (doc) setHeight(doc.documentElement.scrollHeight);
  }

  return (
    <>
      <Seo
        title="Minimum Hole Diameter in Design — CADseekho"
        description="A senior mechanical design engineer's practical guide to minimum hole diameter: why small holes fail in manufacturing, and how to design ones that survive contact with reality."
        type="article"
      />

      <div className="container" style={{ display: "flex", justifyContent: "flex-end", padding: "var(--space-4) 0" }}>
        <a href={SRC} download={FILENAME} className="btn btn--outline btn--sm">
          Download Article
        </a>
      </div>

      <iframe
        ref={iframeRef}
        src={SRC}
        title="Minimum Hole Diameter in Design"
        onLoad={handleLoad}
        style={{ display: "block", width: "100%", height, border: "none" }}
      />
    </>
  );
}
