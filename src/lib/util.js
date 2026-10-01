// Small shared helpers: ids, dates, unit conversion, number formatting.

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const round = (n, d = 0) => { const k = 10 ** d; return Math.round((+n + Number.EPSILON) * k) / k; };
export const sum = (a, f = (x) => x) => a.reduce((t, x) => t + (+f(x) || 0), 0);
export const avg = (a, f = (x) => x) => (a.length ? sum(a, f) / a.length : 0);

// ---- dates (always local, YYYY-MM-DD) ----
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => dayKey(new Date());
export const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000);
export const weekStart = (k = today()) => { const d = parseDay(k); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return dayKey(d); };
export const lastNDays = (n, end = today()) => Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dowShort = (k) => DOW[parseDay(k).getDay()];
export const dowLetter = (k) => DOW[parseDay(k).getDay()][0];
export const fmtDay = (k) => { const d = parseDay(k); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
export const fmtDayLong = (k) => {
  if (k === today()) return 'Today';
  if (k === addDays(today(), -1)) return 'Yesterday';
  if (k === addDays(today(), 1)) return 'Tomorrow';
  const d = parseDay(k);
  return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
export const fmtMonthYear = (k) => { const d = parseDay(k); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const fmtDuration = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
export const fmtDurationShort = (sec) => {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};
export const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

// ---- units ----
export const KG_PER_LB = 0.45359237;
export const kgToLb = (kg) => kg / KG_PER_LB;
export const lbToKg = (lb) => lb * KG_PER_LB;
export const cmToIn = (cm) => cm / 2.54;
export const inToCm = (i) => i * 2.54;
export const cmToFtIn = (cm) => {
  const total = Math.round(cmToIn(cm));
  return { ft: Math.floor(total / 12), inch: total % 12 };
};
export const ftInToCm = (ft, inch) => inToCm((+ft || 0) * 12 + (+inch || 0));

export const isImperial = (units) => units === 'imperial';
export const weightUnit = (units) => (isImperial(units) ? 'lb' : 'kg');
export const lenUnit = (units) => (isImperial(units) ? 'in' : 'cm');
export const dispWeight = (kg, units, d = 1) => (kg == null ? '' : round(isImperial(units) ? kgToLb(kg) : kg, d));
export const parseWeight = (v, units) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? (isImperial(units) ? lbToKg(n) : n) : null; };
export const dispLen = (cm, units, d = 1) => (cm == null ? '' : round(isImperial(units) ? cmToIn(cm) : cm, d));
export const parseLen = (v, units) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? (isImperial(units) ? inToCm(n) : n) : null; };
export const fmtWeight = (kg, units, d = 1) => (kg == null ? '–' : `${dispWeight(kg, units, d)} ${weightUnit(units)}`);
export const fmtHeight = (cm, units) => {
  if (cm == null) return '–';
  if (isImperial(units)) { const { ft, inch } = cmToFtIn(cm); return `${ft}′${inch}″`; }
  return `${Math.round(cm)} cm`;
};
export const fmtNum = (n, d = 0) => (n == null || Number.isNaN(n) ? '–' : round(n, d).toLocaleString('en-US', { maximumFractionDigits: d }));
export const fmtKcal = (n) => fmtNum(Math.round(n));
export const fmtSigned = (n, d = 1) => `${n > 0 ? '+' : ''}${round(n, d)}`;

export function debounce(fn, ms) {
  let t;
  const wrapped = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  wrapped.flush = (...a) => { clearTimeout(t); fn(...a); };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}
export const vibrate = (ms = 15) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
