import { useMemo } from 'preact/hooks';
const COLORS = ['#c6ff3d', '#ffd34d', '#ff7a93', '#62adff', '#a78bfa', '#34e3b0'];
export function Confetti({ n = 46 }) {
  const bits = useMemo(() => Array.from({ length: n }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.8, color: COLORS[i % COLORS.length], rot: Math.random() * 360, dur: 1.8 + Math.random() * 1.4 })), []);
  return <div class="confetti">{bits.map((b, i) => <i key={i} style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }} />)}</div>;
}
