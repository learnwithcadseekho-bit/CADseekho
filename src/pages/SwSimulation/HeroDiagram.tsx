// Blueprint-style hero art: a cantilever with a fixed wall, an end load, a
// von Mises contour along the beam and the hand-calc vs FEA check the course
// is built around. Inline SVG — no image request, crisp at any size.
export function HeroDiagram() {
  // Contour: hot (root, top fibre) to cold (tip). Brand-adjacent ramp.
  const bands = ["#E8622C", "#EE8A3C", "#F2B04F", "#C9C27A", "#8FB3B0", "#6F93B8", "#4F73A6", "#3A5A8F"];
  const x0 = 70;
  const w = 340;
  const bandW = w / bands.length;
  return (
    <figure className="sws-diagram drafting-frame">
      <svg
        viewBox="0 0 480 330"
        role="img"
        aria-labelledby="sws-diagram-title sws-diagram-desc"
        className="sws-diagram__svg"
      >
        <title id="sws-diagram-title">Cantilever study: hand calculation vs SOLIDWORKS Simulation</title>
        <desc id="sws-diagram-desc">
          A cantilever beam fixed at the left wall with a downward load at the free end. A stress contour runs from high at the
          wall to low at the tip. Callouts compare hand-calculated bending stress, 120 MPa, with the FEA result, 123 MPa — within
          5 percent.
        </desc>

        {/* Fixed wall + hatching */}
        <rect x="40" y="70" width="30" height="170" fill="#F5F3ED" stroke="#1B2A4A" strokeWidth="2" />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1="40" y1={82 + i * 18} x2="56" y2={70 + i * 18} stroke="#75849C" strokeWidth="1.25" />
        ))}

        {/* Beam with contour bands */}
        {bands.map((c, i) => (
          <rect key={c} x={x0 + i * bandW} y="130" width={bandW + 0.5} height="40" fill={c} />
        ))}
        <rect x={x0} y="130" width={w} height="40" fill="none" stroke="#1B2A4A" strokeWidth="2" />
        {/* Deflected shape */}
        <path d={`M${x0} 150 Q ${x0 + w * 0.6} 152 ${x0 + w} 176`} fill="none" stroke="#1B2A4A" strokeWidth="1.5" strokeDasharray="6 5" />

        {/* Load arrow */}
        <line x1={x0 + w} y1="58" x2={x0 + w} y2="124" stroke="#B8461A" strokeWidth="3" />
        <path d={`M${x0 + w - 8} 112 L${x0 + w} 128 L${x0 + w + 8} 112 Z`} fill="#B8461A" />
        <text x={x0 + w - 12} y="52" textAnchor="end" className="sws-diagram__label">
          F = 2 kN
        </text>

        {/* Dimension line */}
        <line x1={x0} y1="200" x2={x0} y2="222" stroke="#75849C" />
        <line x1={x0 + w} y1="200" x2={x0 + w} y2="222" stroke="#75849C" />
        <line x1={x0 + 6} y1="214" x2={x0 + w - 6} y2="214" stroke="#75849C" />
        <path d={`M${x0} 214 l10 -4 v8 z M${x0 + w} 214 l-10 -4 v8 z`} fill="#75849C" />
        <text x={x0 + w / 2} y="208" textAnchor="middle" className="sws-diagram__dim">
          L = 300 mm
        </text>

        {/* Legend ramp */}
        {bands.map((c, i) => (
          <rect key={`l${c}`} x={440} y={70 + i * 14} width="14" height="14" fill={c} />
        ))}
        <text x="436" y="66" textAnchor="end" className="sws-diagram__dim">
          σvM
        </text>
        <text x="436" y="80" textAnchor="end" className="sws-diagram__dim">
          max
        </text>
        <text x="436" y="182" textAnchor="end" className="sws-diagram__dim">
          min
        </text>

        {/* Check block */}
        <g transform="translate(40 250)">
          <rect width="400" height="62" fill="#FFFFFF" stroke="#AEB9C9" />
          <line x1="133" y1="0" x2="133" y2="62" stroke="#AEB9C9" />
          <line x1="266" y1="0" x2="266" y2="62" stroke="#AEB9C9" />
          <text x="12" y="22" className="sws-diagram__dim">
            HAND CALC
          </text>
          <text x="12" y="48" className="sws-diagram__value">
            120 MPa
          </text>
          <text x="145" y="22" className="sws-diagram__dim">
            FEA
          </text>
          <text x="145" y="48" className="sws-diagram__value">
            123 MPa
          </text>
          <text x="278" y="22" className="sws-diagram__dim">
            DIFFERENCE
          </text>
          <text x="278" y="48" className="sws-diagram__value sws-diagram__value--ok">
            2.5% ✓
          </text>
        </g>
      </svg>
      <figcaption className="sws-diagram__caption">Every result checked by hand. Target: within 5%.</figcaption>
    </figure>
  );
}
