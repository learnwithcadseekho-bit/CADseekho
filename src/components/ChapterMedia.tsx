import { useEffect, useRef, useState } from "react";
import "@/styles/drafting.css";
import "./chapter-media.css";

// <model-viewer> is a custom element, so React only needs to know its
// attribute names for type-checking.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string;
        alt: string;
        poster?: string;
        loading?: "auto" | "lazy" | "eager";
        "camera-controls"?: boolean | "";
        "touch-action"?: "pan-y" | "pan-x" | "none";
        "shadow-intensity"?: string;
      };
    }
  }
}

interface ChapterMediaProps {
  image: string | null;
  model3d: string | null;
  alt: string;
  /** Chapter number, for the "FIG. n" caption. */
  figure: number;
}

// Per-chapter picture or rotatable 3D model shown beside a syllabus entry.
// Renders nothing when the chapter has neither, rather than an empty frame.
export function ChapterMedia({ image, model3d, alt, figure }: ChapterMediaProps) {
  if (!image && !model3d) return null;

  return (
    <figure className="chapter-media drafting-frame">
      <div className="chapter-media__sheet">
        {model3d ? <ModelViewer src={model3d} poster={image} alt={alt} /> : <img src={image!} alt={alt} loading="lazy" decoding="async" />}
      </div>
      <figcaption className="chapter-media__caption mono-label">
        Fig. {figure}
        {model3d && <span className="chapter-media__hint">Drag to rotate · scroll or pinch to zoom</span>}
      </figcaption>
    </figure>
  );
}

// The viewer library (three.js inside) is ~1 MB, so it's only fetched on a
// course page that actually has a model. Until it's defined — or if either
// the library or the .glb fails to load — the poster image shows in its
// place, so a failure never breaks the layout.
function ModelViewer({ src, poster, alt }: { src: string; poster: string | null; alt: string }) {
  const [state, setState] = useState<"pending" | "ready" | "failed">(
    typeof customElements !== "undefined" && customElements.get("model-viewer") ? "ready" : "pending"
  );
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (state !== "pending") return;
    let cancelled = false;
    import("@google/model-viewer")
      .then(() => !cancelled && setState("ready"))
      .catch(() => !cancelled && setState("failed"));
    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onError = () => setState("failed");
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [state]);

  if (state !== "ready") {
    return poster ? (
      <img src={poster} alt={alt} loading="lazy" decoding="async" />
    ) : (
      <p className="chapter-media__fallback">{state === "failed" ? `3D model unavailable — ${alt}` : alt}</p>
    );
  }

  return (
    <model-viewer
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      alt={alt}
      loading="lazy"
      camera-controls=""
      touch-action="pan-y"
      shadow-intensity="1"
    />
  );
}
