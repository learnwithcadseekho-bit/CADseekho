import { useEffect, useRef, useState } from "react";
import { LAUNCH } from "@/content/launch";

const MOBILE = "(max-width: 767px)";

/**
 * The launch ad video: 9:16 on phones, 4:5 from 768px up.
 *
 * The prerendered HTML has only the poster (a responsive <picture>, so it
 * shows before any JS runs); the video sources are attached after the page
 * has loaded, so the video never competes with the headline, CTA or LCP.
 *
 * `autoplay` (hero): muted, looping, with a "Tap for sound" button that
 * restarts it with sound — never autoplays with sound. Skipped for visitors
 * who ask for reduced motion or data; they get the play controls instead.
 * Without `autoplay` (thank-you page): muted, native controls, plays on tap.
 */
export function AdVideo({ autoplay = false, className = "" }: { autoplay?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [poster, setPoster] = useState<string | undefined>(undefined);
  const [playsAlone, setPlaysAlone] = useState(autoplay);
  const [muted, setMuted] = useState(true);
  const { mobile, desktop } = LAUNCH.video;

  useEffect(() => {
    setPoster(window.matchMedia?.(MOBILE).matches ? mobile.poster : desktop.poster);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (autoplay && (reduce || saveData)) setPlaysAlone(false);
    const attach = () => setReady(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(attach, 300);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", attach, { once: true });
    return () => window.removeEventListener("load", attach);
  }, [autoplay, mobile.poster, desktop.poster]);

  useEffect(() => {
    const video = ref.current;
    if (!ready || !video) return;
    // <source> children added after mount aren't picked up until load().
    video.load();
    if (playsAlone) video.play().catch(() => {});
  }, [ready, playsAlone]);

  function toggleSound() {
    const video = ref.current;
    if (!video) return;
    if (video.muted) {
      video.muted = false;
      video.currentTime = 0; // hear the voice-over from the start
      video.play().catch(() => {});
      setMuted(false);
    } else {
      video.muted = true;
      setMuted(true);
    }
  }

  return (
    <div className={`launch-video ${className}`.trim()}>
      <picture>
        <source media={MOBILE} srcSet={mobile.poster} width={mobile.width} height={mobile.height} />
        <img src={desktop.poster} width={desktop.width} height={desktop.height} alt="" decoding="async" />
      </picture>
      <video
        ref={ref}
        poster={poster}
        muted
        loop={playsAlone}
        playsInline
        autoPlay={playsAlone}
        controls={!playsAlone}
        preload={ready && playsAlone ? "metadata" : "none"}
        aria-label="ANSYS Workbench Foundation course preview"
      >
        {ready && (
          <>
            <source media={MOBILE} src={mobile.src} type="video/mp4" />
            <source src={desktop.src} type="video/mp4" />
          </>
        )}
      </video>
      {playsAlone && ready && (
        <button type="button" className="launch-video__sound" onClick={toggleSound} aria-pressed={!muted}>
          {muted ? "🔊 Tap for sound" : "🔇 Mute"}
        </button>
      )}
    </div>
  );
}
