import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/** Renders a LaTeX string with KaTeX. Bad input shows the source in red instead of throwing. */
export function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: "ignore", trust: false }),
    [tex, block]
  );
  return block ? (
    <div className="tex-block" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
