// Dependency-free SVG charts.
import { useState, useRef, useMemo } from 'preact/hooks';
import { fmtDay } from '../lib/util.js';

export function Ring({ value, max = 1, size = 150, stroke = 14, color = 'var(--accent)', track = 'var(--card3)', children, over }) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const isOver = over ?? value > max;
  return (
    <div class="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style="transform:rotate(-90deg)">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} stroke-width={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={isOver ? 'var(--red)' : color} stroke-width={stroke} stroke-linecap="round"
          stroke-dasharray={C} stroke-dashoffset={C * (1 - pct)} style="transition:stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" />
      </svg>
      <div class="ring-center">{children}</div>
    </div>
  );
}

const niceTicks = (min, max, n = 4) => {
  if (min === max) { min -= 1; max += 1; }
  const step0 = (max - min) / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const out = []; for (let v = lo; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
};

/** points: [{x: number|string key, y: number, label?: string, t?: number (trend)}] sorted by x (numeric). */
export function LineChart({ points, height = 190, color = 'var(--accent)', fmt = (v) => v, goal, showTrend, unit = '', xLabel = (p) => fmtDay(p.d || p.label), pad = 6 }) {
  const W = 340, H = height, L = 36, R = 10, T = 14, B = 22;
  const [hover, setHover] = useState(null);
  const ref = useRef();
  const gid = useMemo(() => 'g' + Math.random().toString(36).slice(2, 7), []);
  const ys = points.flatMap((p) => [p.y, p.t].filter((v) => v != null)).concat(goal != null ? [goal] : []);
  const ticks = ys.length ? niceTicks(Math.min(...ys), Math.max(...ys), 3) : [0, 1];
  if (!points.length) return <div class="muted center small" style={{ padding: '30px 0' }}>No data yet</div>;
  const xs = points.map((p) => p.x), xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const sx = (x) => L + (xMax === xMin ? (W - L - R) / 2 : ((x - xMin) / (xMax - xMin)) * (W - L - R));
  const sy = (y) => T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const path = (key) => points.filter((p) => p[key] != null).map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p[key]).toFixed(1)}`).join(' ');
  const d = path('y');
  const area = points.length > 1 ? `${d} L${sx(points[points.length - 1].x)} ${H - B} L${sx(points[0].x)} ${H - B} Z` : '';
  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bd = 1e9;
    points.forEach((p, i) => { const dd = Math.abs(sx(p.x) - px); if (dd < bd) { bd = dd; best = i; } });
    setHover(best);
  };
  const h = hover != null ? points[hover] : null;
  return (
    <svg ref={ref} class="chart" viewBox={`0 0 ${W} ${H}`} onPointerDown={onMove} onPointerMove={(e) => e.buttons && onMove(e)} onPointerLeave={() => setHover(null)} onPointerUp={() => setTimeout(() => setHover(null), 1400)}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color={color} stop-opacity=".32" /><stop offset="1" stop-color={color} stop-opacity="0" /></linearGradient></defs>
      {ticks.map((t) => (<g key={t}><line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke="var(--line)" stroke-width="1" /><text x={L - 6} y={sy(t) + 3.5} text-anchor="end">{fmt(t)}</text></g>))}
      {goal != null && <g><line x1={L} x2={W - R} y1={sy(goal)} y2={sy(goal)} stroke="var(--amber)" stroke-width="1.4" stroke-dasharray="5 4" /><text x={W - R} y={sy(goal) - 5} text-anchor="end" style="fill:var(--amber)">Goal</text></g>}
      {area && <path d={area} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={showTrend ? 'var(--text3)' : color} stroke-width={showTrend ? 1.5 : 3} stroke-linecap="round" stroke-linejoin="round" opacity={showTrend ? 0.7 : 1} />
      {showTrend && <path d={path('t')} fill="none" stroke={color} stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />}
      {points.length <= 40 && points.map((p) => <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={showTrend ? 2.4 : 3.4} fill={showTrend ? 'var(--text3)' : color} stroke="var(--card)" stroke-width="1.5" />)}
      <text x={L} y={H - 4}>{xLabel(points[0])}</text>
      {points.length > 1 && <text x={W - R} y={H - 4} text-anchor="end">{xLabel(points[points.length - 1])}</text>}
      {h && (<g>
        <line x1={sx(h.x)} x2={sx(h.x)} y1={T} y2={H - B} stroke="var(--text3)" stroke-dasharray="3 3" />
        <circle cx={sx(h.x)} cy={sy(h.y)} r="6" fill={color} stroke="var(--bg)" stroke-width="2.5" />
        <g transform={`translate(${Math.min(Math.max(sx(h.x) - 46, L), W - R - 92)} ${T - 2})`}>
          <rect width="92" height="36" rx="9" fill="var(--card3)" stroke="var(--line2)" />
          <text x="46" y="15" text-anchor="middle" style="fill:var(--text);font-size:12.5px;font-weight:800">{fmt(h.y)}{unit}</text>
          <text x="46" y="28" text-anchor="middle">{xLabel(h)}</text>
        </g>
      </g>)}
    </svg>
  );
}

/** bars: [{label, value, color?, highlight?}] */
export function BarChart({ bars, height = 130, goal, color = 'var(--accent)', fmt = (v) => Math.round(v) }) {
  const W = 340, H = height, T = 16, B = 22;
  const max = Math.max(1, ...bars.map((b) => b.value), goal || 0) * 1.1;
  const bw = (W - 8) / bars.length;
  const y = (v) => T + (1 - v / max) * (H - T - B);
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${H}`}>
      {goal != null && <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--amber)" stroke-dasharray="5 4" stroke-width="1.3" />}
      {bars.map((b, i) => {
        const x = 4 + i * bw + bw * 0.18, w = bw * 0.64, top = y(b.value);
        return (<g key={i}>
          <rect x={x} y={T} width={w} height={H - T - B} rx="7" fill="var(--card2)" opacity={b.value ? 0 : 0.6} />
          <rect x={x} y={top} width={w} height={Math.max(b.value ? 3 : 0, H - B - top)} rx="7" fill={b.color || color} opacity={b.highlight === false ? 0.45 : 1} />
          {b.value > 0 && bars.length <= 8 && <text x={x + w / 2} y={top - 5} text-anchor="middle" style="fill:var(--text2)">{fmt(b.value)}</text>}
          <text x={x + w / 2} y={H - 6} text-anchor="middle" style={b.today ? 'fill:var(--text);font-weight:800' : ''}>{b.label}</text>
        </g>);
      })}
    </svg>
  );
}

export function Sparkline({ values, color = 'var(--accent)', width = 90, height = 34 }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 3 - ((v - min) / (max - min || 1)) * (height - 6)}`).join(' ');
  return <svg width={width} height={height}><polyline points={pts} fill="none" stroke={color} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>;
}

/** Horizontal segmented scale with a marker (body-fat categories etc.). */
export function ScaleBar({ segments, value, min, max }) {
  const pos = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <div style="position:relative;padding-top:14px">
      <div class="gauge-scale">{segments.map((s, i) => <i key={i} class="on" style={{ background: s.color, flex: s.weight || 1 }} />)}</div>
      <div style={{ position: 'absolute', top: 0, left: `calc(${pos * 100}% - 7px)`, width: 14, height: 14, transition: 'left .7s cubic-bezier(.22,1,.36,1)' }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 14 L0 2 Q0 0 2 0 H12 Q14 0 14 2 Z" fill="var(--text)" /></svg>
      </div>
    </div>
  );
}
