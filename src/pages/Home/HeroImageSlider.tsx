import { useEffect, useState } from "react";
import "@/styles/drafting.css";
import "./home.css";
import { HeroSketch } from "./HeroSketch";

// Drop image files into ./hero-images/ (jpg/jpeg/png/webp) — they're picked
// up automatically, in filename order, with no code changes needed.
// Recommended size: 1200x960px (5:4), same ratio for every slide.
const slideModules = import.meta.glob("./hero-images/*.{png,jpg,jpeg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const SLIDES = Object.keys(slideModules)
  .sort()
  .map((path) => slideModules[path]);

const AUTOPLAY_MS = 4500;

export function HeroImageSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (SLIDES.length < 2 || paused) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused]);

  if (SLIDES.length === 0) {
    return <HeroSketch />;
  }

  return (
    <div
      className="hero-slider drafting-frame"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-slider__chrome">
        <span className="mono-label">CADSEEKHO / GALLERY</span>
        <span className="mono-label">
          {String(active + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </div>

      <div className="hero-slider__frame">
        {SLIDES.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            className="hero-slider__img"
            style={{ opacity: index === active ? 1 : 0 }}
            aria-hidden={index !== active}
          />
        ))}
      </div>

      {SLIDES.length > 1 && (
        <div className="hero-slider__dots" role="tablist" aria-label="Slide selector">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show slide ${index + 1}`}
              className={`hero-slider__dot${index === active ? " is-active" : ""}`}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
