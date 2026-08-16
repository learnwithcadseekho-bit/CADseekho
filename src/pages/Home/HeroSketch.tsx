import "@/styles/drafting.css";
import "./home.css";

// The framed "drawing sheet" visual called for in Section 8: a line-art part
// sketch with dimension callouts and mono file-name chrome, evoking a real
// engineering drawing rather than stock photography.
export function HeroSketch() {
  return (
    <div className="hero-sketch drafting-frame">
      <div className="hero-sketch__chrome">
        <span className="mono-label">FILE — BRACKET_MOUNT.SLDPRT</span>
        <span className="mono-label">SCALE 1:2</span>
      </div>

      <svg viewBox="0 0 400 320" className="hero-sketch__art" aria-hidden="true">
        <defs>
          <pattern id="hero-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#C7D0DC" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="320" fill="url(#hero-grid)" opacity="0.5" />

        {/* Bracket body */}
        <path
          d="M 80 240 L 80 120 L 140 60 L 260 60 L 320 120 L 320 240 Z"
          fill="none"
          stroke="#1B2A4A"
          strokeWidth="2"
        />
        {/* Mounting holes */}
        <circle cx="120" cy="200" r="14" fill="none" stroke="#E8622C" strokeWidth="2" />
        <circle cx="280" cy="200" r="14" fill="none" stroke="#E8622C" strokeWidth="2" />
        <circle cx="200" cy="110" r="20" fill="none" stroke="#1B2A4A" strokeWidth="1.5" />
        <line x1="180" y1="110" x2="220" y2="110" stroke="#1B2A4A" strokeWidth="1" />
        <line x1="200" y1="90" x2="200" y2="130" stroke="#1B2A4A" strokeWidth="1" />

        {/* Dimension line under the part */}
        <line x1="80" y1="270" x2="320" y2="270" stroke="#9AA8BC" strokeWidth="1" />
        <line x1="80" y1="264" x2="80" y2="276" stroke="#9AA8BC" strokeWidth="1" />
        <line x1="320" y1="264" x2="320" y2="276" stroke="#9AA8BC" strokeWidth="1" />
        <text x="200" y="290" textAnchor="middle" fontSize="11" fill="#5B6B7F" fontFamily="monospace">
          240.00 mm
        </text>

        {/* Dimension line beside the part */}
        <line x1="350" y1="60" x2="350" y2="240" stroke="#9AA8BC" strokeWidth="1" />
        <line x1="344" y1="60" x2="356" y2="60" stroke="#9AA8BC" strokeWidth="1" />
        <line x1="344" y1="240" x2="356" y2="240" stroke="#9AA8BC" strokeWidth="1" />
      </svg>

      <div className="hero-sketch__chrome hero-sketch__chrome--bottom">
        <span className="mono-label">REV — A</span>
        <span className="mono-label">CADSEEKHO / MECHANICAL</span>
      </div>
    </div>
  );
}
