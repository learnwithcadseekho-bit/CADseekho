import "@/styles/drafting.css";

// Line-art technical-sketch placeholder shown wherever a course/category
// image hasn't been set in the database yet (Section 34). `seed` varies the
// motif slightly per card so a grid of placeholders doesn't look identical.
export function PlaceholderArt({ label, seed = 0 }: { label: string; seed?: number }) {
  const offset = (seed % 5) * 8;

  return (
    <div className="placeholder-art">
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id={`grid-${seed}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#C7D0DC" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="200" height="150" fill="#FAFAF7" />
        <rect width="200" height="150" fill={`url(#grid-${seed})`} opacity="0.6" />
        <rect
          x={40 + offset}
          y={35}
          width="90"
          height="60"
          fill="none"
          stroke="#1B2A4A"
          strokeWidth="1.5"
        />
        <circle cx={70 + offset} cy={65} r="14" fill="none" stroke="#E8622C" strokeWidth="1.5" />
        <line x1={40 + offset} y1={110} x2={130 + offset} y2={110} stroke="#9AA8BC" strokeWidth="1" />
        <line x1={40 + offset} y1={106} x2={40 + offset} y2={114} stroke="#9AA8BC" strokeWidth="1" />
        <line x1={130 + offset} y1={106} x2={130 + offset} y2={114} stroke="#9AA8BC" strokeWidth="1" />
      </svg>
      <span className="placeholder-art__label">{label}</span>
    </div>
  );
}
