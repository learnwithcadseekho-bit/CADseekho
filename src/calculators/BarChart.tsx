// Horizontal bar chart for comparing a handful of stresses, with an optional
// reference line (e.g. the isolated-hole 3σ or the yield strength).

export interface Bar {
  label: string;
  value: number;
  color: string;
}

export interface ReferenceLine {
  label: string;
  value: number;
  color: string;
}

const W = 640;
const ROW = 46;
const PAD = { top: 12, right: 90, bottom: 40, left: 150 };

export function BarChart({
  title,
  bars,
  references = [],
  unit,
  description,
}: {
  title: string;
  bars: Bar[];
  references?: ReferenceLine[];
  unit: string;
  description: string;
}) {
  const H = PAD.top + bars.length * ROW + PAD.bottom;
  const max = Math.max(...bars.map((b) => b.value), ...references.map((r) => r.value)) * 1.08;
  const sx = (v: number) => PAD.left + (Math.max(v, 0) / max) * (W - PAD.left - PAD.right);

  return (
    <figure className="calc-chart">
      <figcaption className="calc-chart__title">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} className="calc-chart__svg">
        {bars.map((b, i) => {
          const y = PAD.top + i * ROW;
          return (
            <g key={b.label}>
              <text x={PAD.left - 10} y={y + ROW / 2} textAnchor="end" dominantBaseline="middle" className="calc-chart__axis">
                {b.label}
              </text>
              <rect x={PAD.left} y={y + 9} width={sx(b.value) - PAD.left} height={ROW - 18} fill={b.color} />
              <text x={sx(b.value) + 8} y={y + ROW / 2} dominantBaseline="middle" className="calc-chart__marker">
                {b.value.toFixed(1)} {unit}
              </text>
            </g>
          );
        })}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke="#75849C" />
        {references.map((r, i) => (
          <g key={r.label}>
            <line
              x1={sx(r.value)}
              x2={sx(r.value)}
              y1={PAD.top}
              y2={H - PAD.bottom + 4}
              stroke={r.color}
              strokeWidth={2}
              strokeDasharray="6 5"
            />
            <text x={sx(r.value)} y={H - PAD.bottom + 18 + i * 16} textAnchor="middle" className="calc-chart__tick">
              {r.label}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
