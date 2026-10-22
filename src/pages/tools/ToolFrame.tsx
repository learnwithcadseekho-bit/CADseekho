import { useEffect, useRef, useState } from "react";

const HEIGHT_MESSAGE = "cadseekho-tool-height";
const FALLBACK_HEIGHT = 1600;

// Each tool is a self-contained static page (public/tools/<name>.html). In
// embed mode it hides its own header/footer and posts its content height, so
// the iframe can be sized to fit with no inner scrollbar.
export function ToolFrame({ src, title }: { src: string; title: string }) {
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
