// Global rest timer shared by the workout screen and the mini bar.
import { useSyncExternalStore } from 'preact/compat';
import { vibrate } from './util.js';

let r = { endsAt: 0, total: 0, fired: true };
const subs = new Set();
const set = (p) => { r = { ...r, ...p }; subs.forEach((f) => f()); };
let tick;
let ctx;

function beep() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch { /* audio not available */ }
}
export const primeAudio = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume?.(); } catch { /* ignore */ } };

function loop() {
  clearInterval(tick);
  tick = setInterval(() => {
    if (!r.fired && Date.now() >= r.endsAt) { set({ fired: true }); vibrate([200, 100, 200, 100, 300]); beep(); }
    subs.forEach((f) => f());
    if (r.fired && Date.now() > r.endsAt + 4000) { clearInterval(tick); set({ endsAt: 0, total: 0 }); }
  }, 250);
}
export const startRest = (sec, haptics = true) => { primeAudio(); set({ endsAt: Date.now() + sec * 1000, total: sec, fired: false }); loop(); };
export const addRest = (sec) => { if (!r.endsAt) return; set({ endsAt: r.endsAt + sec * 1000, total: r.total + sec, fired: false }); loop(); };
export const skipRest = () => { clearInterval(tick); set({ endsAt: 0, total: 0, fired: true }); };
const snap = () => r;
export const useRest = () => {
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, snap);
  const left = r.endsAt ? Math.max(0, Math.ceil((r.endsAt - Date.now()) / 1000)) : 0;
  return { active: !!r.endsAt, left, total: r.total, done: r.endsAt > 0 && left === 0 };
};
