// Minimal responsive SVG line chart for calculator results — no charting
// library needed for a few smooth curves and a marked design point.

export interface ChartSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
  dashed?: boolean;
}

export interface ChartMarker {
  x: number;
  y: number;
  label: string;
}

interface LineChartProps {
  title: string;
  series: ChartSeries[];
  markers?: ChartMarker[];
  xLabel: string;
  yLabel: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  /** One-sentence text alternative for screen readers. */
  description: string;
}

const W = 640;
const H = 360;
const PAD = { top: 16, right: 20, bottom: 52, left: 60 };

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

function fmtTick(v: number) {
  return Math.abs(v) >= 1000 ? v.toLocaleString("en-IN") : String(Number(v.toPrecision(4)));
}

export function LineChart({ title, series, markers = [], xLabel, yLabel, xDomain, yDomain, description }: LineChartProps) {
  const all = series.flatMap((s) => s.points).concat(markers);
  const [x0, x1] = xDomain ?? [Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x))];
  const yMaxData = Math.max(...all.map((p) => p.y));
  const yMinData = Math.min(...all.map((p) => p.y));
  const [y0, y1] = yDomain ?? [Math.min(0, yMinData), yMaxData * 1.08];

  const sx = (x: number) => PAD.left + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.left - PAD.right);
  const sy = (y: number) => H - PAD.bottom - ((y - y0) / (y1 - y0 || 1)) * (H - PAD.top - PAD.bottom);
  const path = (pts: { x: number; y: number }[]) =>
    pts
      .filter((p) => p.y >= y0 && p.y <= y1)
      .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
      .join(" ");

  const xTicks = niceTicks(x0, x1);
  const yTicks = niceTicks(y0, y1);

  return (
    <figure className="calc-chart">
      <figcaption className="calc-chart__title">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} className="calc-chart__svg">
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="#E3E7EE" />
            <text x={PAD.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle" className="calc-chart__tick">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={H - PAD.bottom} y2={H - PAD.bottom + 5} stroke="#75849C" />
            <text x={sx(t)} y={H - PAD.bottom + 18} textAnchor="middle" className="calc-chart__tick">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#75849C" />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke="#75849C" />
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 10} textAnchor="middle" className="calc-chart__axis">
          {xLabel}
        </text>
        <text
          x={16}
          y={(PAD.top + H - PAD.bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${(PAD.top + H - PAD.bottom) / 2})`}
          className="calc-chart__axis"
        >
          {yLabel}
        </text>

        {series.map((s) => (
          <path
            key={s.label}
            d={path(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={2.25}
            strokeDasharray={s.dashed ? "6 5" : undefined}
            strokeLinejoin="round"
          />
        ))}

        {markers.map((m) => (
          <g key={m.label}>
            <line x1={sx(m.x)} x2={sx(m.x)} y1={sy(m.y)} y2={H - PAD.bottom} stroke="#E8622C" strokeDasharray="3 4" />
            <circle cx={sx(m.x)} cy={sy(m.y)} r={6} fill="#E8622C" stroke="#fff" strokeWidth={2} />
            <text
              x={sx(m.x) + (sx(m.x) > W * 0.7 ? -10 : 10)}
              y={sy(m.y) - 10}
              textAnchor={sx(m.x) > W * 0.7 ? "end" : "start"}
              className="calc-chart__marker"
            >
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      <ul className="calc-chart__legend">
        {series.map((s) => (
          <li key={s.label}>
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" x2="22" y1="4" y2="4" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? "5 4" : undefined} />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
