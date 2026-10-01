// Pure fitness maths. No DOM, no storage - easy to unit test.
import { clamp, round, avg, addDays, daysBetween, parseDay } from './util.js';

export const MIN_AGE = 13;

export function ageFromBirthdate(iso, now = new Date()) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  let age = now.getFullYear() - y;
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}
export const isMinor = (age) => age != null && age < 18;

// ---------- BMI ----------
export const bmi = (kg, cm) => (kg && cm ? kg / (cm / 100) ** 2 : null);
export function bmiCategory(b, age) {
  if (b == null) return { label: '–', tone: 'muted' };
  if (age != null && age < 18) return { label: 'Use growth charts', tone: 'muted' };
  if (b < 18.5) return { label: 'Underweight', tone: 'warn' };
  if (b < 25) return { label: 'Healthy', tone: 'good' };
  if (b < 30) return { label: 'Overweight', tone: 'warn' };
  return { label: 'Obese', tone: 'bad' };
}

// ---------- energy ----------
export const ACTIVITY = [
  { id: 'sedentary', mult: 1.2, label: 'Mostly sitting', hint: 'Desk job, little exercise' },
  { id: 'light', mult: 1.375, label: 'Lightly active', hint: 'Training 1–3 days / week' },
  { id: 'moderate', mult: 1.55, label: 'Moderately active', hint: 'Training 3–5 days / week' },
  { id: 'very', mult: 1.725, label: 'Very active', hint: 'Hard training 6–7 days / week' },
  { id: 'athlete', mult: 1.9, label: 'Athlete / physical job', hint: 'Twice-a-day or heavy labour' },
];
export const activityMult = (id) => ACTIVITY.find((a) => a.id === id)?.mult ?? 1.55;

export function bmr({ sex, kg, cm, age, bodyFatPct }) {
  if (bodyFatPct && bodyFatPct > 3 && bodyFatPct < 60) {
    const lean = kg * (1 - bodyFatPct / 100);
    return 370 + 21.6 * lean; // Katch-McArdle
  }
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161); // Mifflin-St Jeor
}

export const PACE_OPTIONS = { lose: [0.25, 0.5, 0.75], gain: [0.1, 0.25, 0.4] };
export const defaultPace = (goal) => (goal === 'gain' ? 0.25 : 0.5);

export const GOALS = [
  { id: 'lose', label: 'Lose fat', hint: 'Calorie deficit, keep muscle', emoji: '🔥' },
  { id: 'recomp', label: 'Recomp', hint: 'Build muscle, lose fat slowly', emoji: '⚖️' },
  { id: 'gain', label: 'Build muscle', hint: 'Small surplus, lean gains', emoji: '💪' },
  { id: 'maintain', label: 'Maintain', hint: 'Stay where you are', emoji: '🎯' },
];

/** Daily calories + macros. Teens (13-17) get gentler limits and no aggressive deficits. */
export function computeTargets({ sex, kg, cm, age, activity = 'moderate', goal = 'maintain', rateKgPerWeek, bodyFatPct }) {
  const minor = isMinor(age);
  const B = bmr({ sex, kg, cm, age, bodyFatPct });
  const maintenance = B * activityMult(activity);
  const notes = [];
  let delta = 0;
  if (goal === 'lose') {
    const rate = clamp(rateKgPerWeek ?? 0.5, 0.1, Math.max(0.2, kg * 0.01));
    delta = -rate * 1100;
  } else if (goal === 'gain') {
    delta = clamp(rateKgPerWeek ?? 0.25, 0.1, 0.5) * 1100;
  } else if (goal === 'recomp') {
    delta = -maintenance * 0.05;
  }
  if (minor) {
    const cap = maintenance * 0.1;
    if (Math.abs(delta) > cap) { delta = Math.sign(delta) * cap; notes.push('Teen safety: changes are capped at 10% of maintenance while you are still growing.'); }
  }
  let kcal = maintenance + delta;
  const floor = minor ? (sex === 'male' ? 1800 : 1600) : sex === 'male' ? 1500 : 1200;
  if (kcal < floor) { kcal = floor; notes.push(`Calories were raised to a safe minimum of ${floor} kcal.`); }
  kcal = Math.round(kcal / 10) * 10;

  const proteinPerKg = minor ? 1.6 : goal === 'lose' || goal === 'recomp' ? 2.0 : goal === 'gain' ? 1.8 : 1.6;
  let protein = Math.round((proteinPerKg * kg) / 5) * 5;
  protein = Math.min(protein, Math.round((kcal * 0.35) / 4 / 5) * 5);
  const fat = Math.round(Math.max(0.6 * kg, (kcal * 0.27) / 9) / 5) * 5;
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4 / 5) * 5);
  const water = Math.round((kg * 35) / 100) * 100;
  return { kcal, protein, carbs, fat, water, bmr: Math.round(B), maintenance: Math.round(maintenance), delta: Math.round(kcal - maintenance), notes };
}

// ---------- body fat ----------
const log10 = Math.log10;
/** U.S. Navy circumference method (all cm). Returns % or null. */
export function navyBodyFat({ sex, cm, neckCm, waistCm, hipCm }) {
  if (!cm || !neckCm || !waistCm) return null;
  let bf;
  if (sex === 'male') {
    if (waistCm <= neckCm) return null;
    bf = 495 / (1.0324 - 0.19077 * log10(waistCm - neckCm) + 0.15456 * log10(cm)) - 450;
  } else {
    if (!hipCm || waistCm + hipCm <= neckCm) return null;
    bf = 495 / (1.29579 - 0.35004 * log10(waistCm + hipCm - neckCm) + 0.221 * log10(cm)) - 450;
  }
  return Number.isFinite(bf) ? clamp(bf, 2, 60) : null;
}
/** Deurenberg BMI-based estimate (adult vs child equation). */
export function bmiBodyFat({ sex, kg, cm, age }) {
  const b = bmi(kg, cm);
  if (!b || age == null) return null;
  const s = sex === 'male' ? 1 : 0;
  const bf = age < 16 ? 1.51 * b - 0.7 * age - 3.6 * s + 1.4 : 1.2 * b + 0.23 * age - 10.8 * s - 5.4;
  return clamp(bf, 3, 60);
}
/** CUN-BAE (Gomez-Ambrosi 2012): more accurate than plain BMI for adults, needs only age/sex/BMI. */
export function cunBae({ sex, kg, cm, age }) {
  const b = bmi(kg, cm);
  if (!b || age == null) return null;
  const f = sex === 'male' ? 0 : 1;
  const bf = -44.988 + 0.503 * age + 10.689 * f + 3.172 * b - 0.026 * b * b + 0.181 * b * f - 0.02 * b * age - 0.005 * b * b * f + 0.00021 * b * b * age;
  return clamp(bf, 3, 60);
}
/** Jackson-Pollock 3-site skinfold (mm) + Siri. male: chest, abdomen, thigh; female: triceps, suprailiac, thigh. */
export function skinfoldBodyFat({ sex, age, a, b, c }) {
  const S = (+a || 0) + (+b || 0) + (+c || 0);
  if (!a || !b || !c || age == null) return null;
  const D = sex === 'male'
    ? 1.10938 - 0.0008267 * S + 0.0000016 * S * S - 0.0002574 * age
    : 1.0994921 - 0.0009929 * S + 0.0000023 * S * S - 0.0001392 * age;
  return clamp(495 / D - 450, 2, 60);
}
export const SKINFOLD_SITES = {
  male: ['Chest', 'Abdomen', 'Thigh'],
  female: ['Triceps', 'Suprailiac (hip)', 'Thigh'],
};

const BF_RANGES = {
  male: [[2, 5, 'Essential'], [6, 13, 'Athletic'], [14, 17, 'Fit'], [18, 24, 'Average'], [25, 100, 'Above average']],
  female: [[10, 13, 'Essential'], [14, 20, 'Athletic'], [21, 24, 'Fit'], [25, 31, 'Average'], [32, 100, 'Above average']],
};
export function bfCategory(sex, pct) {
  const rows = BF_RANGES[sex] || BF_RANGES.male;
  if (pct < rows[0][0]) return { label: 'Very low', idx: 0 };
  for (let i = 0; i < rows.length; i++) if (pct <= rows[i][1] + 0.99) return { label: rows[i][2], idx: i };
  return { label: 'Above average', idx: rows.length - 1 };
}
export const bfScale = (sex) => BF_RANGES[sex] || BF_RANGES.male;
export const leanMassKg = (kg, bf) => kg * (1 - bf / 100);
export const fatMassKg = (kg, bf) => kg * (bf / 100);
export function ffmi(kg, bf, cm) {
  const lean = leanMassKg(kg, bf);
  const h = cm / 100;
  const raw = lean / (h * h);
  return { raw, normalized: raw + 6.1 * (1.8 - h) };
}

// ---------- strength ----------
export const epley1RM = (w, reps) => (!w || !reps ? 0 : reps === 1 ? w : w * (1 + reps / 30));

// Bodyweight ratios (approximate community strength standards): beginner, novice, intermediate, advanced, elite
export const STANDARDS = {
  squat: { label: 'Squat', male: [0.75, 1.25, 1.75, 2.5, 3.25], female: [0.5, 0.85, 1.35, 1.9, 2.5] },
  bench: { label: 'Bench press', male: [0.5, 0.75, 1.25, 1.75, 2.25], female: [0.25, 0.5, 0.75, 1.15, 1.5] },
  deadlift: { label: 'Deadlift', male: [1.0, 1.5, 2.25, 3.0, 3.75], female: [0.5, 1.0, 1.5, 2.25, 3.0] },
  ohp: { label: 'Overhead press', male: [0.35, 0.55, 0.8, 1.1, 1.4], female: [0.2, 0.35, 0.5, 0.75, 1.0] },
  row: { label: 'Barbell row', male: [0.5, 0.75, 1.15, 1.5, 2.0], female: [0.25, 0.5, 0.75, 1.0, 1.4] },
};
export const LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
export function strengthLevel(lift, sex, bodyKg, e1rm) {
  const t = STANDARDS[lift]?.[sex === 'female' ? 'female' : 'male'];
  if (!t || !bodyKg || !e1rm) return null;
  const ratio = e1rm / bodyKg;
  let idx = -1;
  for (let i = 0; i < t.length; i++) if (ratio >= t[i]) idx = i;
  const prev = idx >= 0 ? t[idx] : 0;
  const next = idx < t.length - 1 ? t[idx + 1] : null;
  return {
    ratio, idx, level: idx >= 0 ? LEVELS[idx] : 'Untrained',
    nextLevel: next ? LEVELS[idx + 1] : null,
    nextKg: next ? next * bodyKg : null,
    progress: next ? clamp((ratio - prev) / (next - prev), 0, 1) : 1,
  };
}

// ---------- genetic potential & goal checker ----------
/** Casey Butt-style max lean mass from frame size. Heights/circumferences in cm. Estimates wrist/ankle if absent. */
export function maxPotential({ sex, heightCm, wristCm, ankleCm, bfPct = 10 }) {
  const wrist = wristCm || heightCm * 0.098;
  const ankle = ankleCm || heightCm * 0.127;
  const H = heightCm / 2.54, W = wrist / 2.54, A = ankle / 2.54;
  const base = H ** 1.5 * (Math.sqrt(W) / 22.667 + Math.sqrt(A) / 17.0104); // lbs of lean-ish mass
  const sexK = sex === 'female' ? 0.85 : 1;
  const maxWeightKg = (base * (bfPct / 224 + 1) * 0.45359237) * sexK;
  const maxLeanKg = maxWeightKg * (1 - bfPct / 100);
  return { maxWeightKg, maxLeanKg, estimatedFrame: !wristCm || !ankleCm };
}

/** Half-life (years) of the remaining muscle potential - slows as you approach your ceiling. */
const halfLife = (f) => (f < 0.8 ? 0.9 : f < 0.9 ? 1.4 : f < 0.95 ? 2 : 3);

export function checkGoal({ sex, age, heightCm, weightKg, bfPct, wristCm, ankleCm, goalWeightKg, goalBfPct }) {
  const out = { notes: [], verdict: 'ok', verdictLabel: 'Realistic' };
  const lean0 = leanMassKg(weightKg, bfPct);
  const fat0 = weightKg - lean0;
  const gBf = goalBfPct ?? bfPct;
  const gW = goalWeightKg ?? weightKg;
  const leanT = gW * (1 - gBf / 100);
  const fatT = gW - leanT;
  Object.assign(out, { lean0, fat0, leanT, fatT, dLean: leanT - lean0, dFat: fatT - fat0 });

  const minor = isMinor(age);
  const pot = maxPotential({ sex, heightCm, wristCm, ankleCm });
  out.pot = pot;
  out.pctPotential = clamp(lean0 / pot.maxLeanKg, 0, 1.2);
  out.minor = minor;

  // muscle phase
  let monthsMuscle = 0;
  if (out.dLean > 0.3 && !minor) {
    const M = pot.maxLeanKg;
    if (leanT >= M * 0.985) { out.verdict = 'unrealistic'; out.verdictLabel = 'Beyond natural ceiling'; out.notes.push(`That target needs ~${round(leanT, 1)} kg of lean mass. Your estimated natural ceiling is ~${round(M, 1)} kg.`); monthsMuscle = Infinity; }
    else {
      const hl = halfLife(lean0 / M);
      monthsMuscle = 12 * hl * Math.log2(Math.max(M - lean0, 0.01) / (M - leanT));
    }
  } else if (out.dLean > 0.3 && minor) {
    monthsMuscle = (out.dLean / 0.4); // ~0.4 kg lean gain / month is a cautious teen pace
    out.notes.push('Potential estimates are disabled while you are still growing. Timeline uses a cautious teen pace.');
  }
  // fat phase: 0.5–1% bodyweight / week, gentler for teens
  let monthsFat = 0;
  if (out.dFat < -0.3) {
    const perWeek = Math.max(0.2, weightKg * (minor ? 0.003 : 0.0065));
    monthsFat = (-out.dFat / perWeek) / 4.345;
  }
  // muscle gain while adding fat: expect ~30–50% of the gain is fat; keep it simple and add a bulk-fat allowance
  const total = (isFinite(monthsMuscle) ? monthsMuscle : 0) + monthsFat;
  out.monthsMuscle = monthsMuscle;
  out.monthsFat = monthsFat;
  out.monthsTotal = isFinite(monthsMuscle) ? total : Infinity;

  if (out.verdict !== 'unrealistic') {
    if (out.monthsTotal <= 1 && Math.abs(out.dLean) < 0.5 && Math.abs(out.dFat) < 0.5) { out.verdict = 'there'; out.verdictLabel = 'You are already there'; }
    else if (out.monthsTotal > 30) { out.verdict = 'ambitious'; out.verdictLabel = 'Very long road'; out.notes.push('Consider a closer milestone first – progress is easier to keep up with short goals.'); }
    else if (out.monthsTotal > 14) { out.verdict = 'ambitious'; out.verdictLabel = 'Ambitious but possible'; }
  }
  if (out.dLean > 0.3 && out.dFat < -0.3 && !minor) out.notes.push('Gaining muscle and losing fat together is slow. Most people do it in phases: lean-bulk first, then cut (or the reverse if body fat is above ~20%).');
  if (minor && out.dFat < -0.3) out.notes.push('At your age the best plan is training hard, eating enough protein and letting height catch up – talk to a parent or doctor before cutting weight.');
  if (gBf < (sex === 'female' ? 14 : 7)) { out.verdict = 'unrealistic'; out.verdictLabel = 'Too lean to be healthy'; out.notes.push('That body fat is below what is healthy to sustain long term.'); }
  out.etaDate = isFinite(out.monthsTotal) ? addDays(new Date().toISOString().slice(0, 10), Math.round(out.monthsTotal * 30.4)) : null;
  // typical monthly muscle gain right now
  if (!minor) {
    const M = pot.maxLeanKg, hl = halfLife(lean0 / M);
    out.monthlyGainNow = Math.max(0, (M - lean0) * (1 - 2 ** (-1 / (12 * hl))));
  }
  return out;
}

// ---------- symmetry ----------
const pctDiff = (l, r) => (l && r ? (Math.abs(l - r) / Math.max(l, r)) * 100 : null);
const scoreFromDiff = (diffPct, tol = 1, bad = 8) => clamp(100 - ((Math.max(0, diffPct - tol)) / (bad - tol)) * 60, 40, 100);
const scoreFromRatio = (actual, ideal, tolPct = 4, badPct = 25) => {
  const dev = (Math.abs(actual - ideal) / ideal) * 100;
  return clamp(100 - (Math.max(0, dev - tolPct) / (badPct - tolPct)) * 60, 40, 100);
};

export function symmetryReport({ sex, m }) {
  const items = [];
  const pairs = [['bicepL', 'bicepR', 'Biceps', 'biceps'], ['forearmL', 'forearmR', 'Forearms', 'forearms'], ['thighL', 'thighR', 'Thighs', 'quads'], ['calfL', 'calfR', 'Calves', 'calves']];
  for (const [l, r, label, muscle] of pairs) {
    const d = pctDiff(m[l], m[r]);
    if (d == null) continue;
    const weaker = m[l] < m[r] ? 'left' : m[r] < m[l] ? 'right' : null;
    items.push({
      id: label.toLowerCase(), kind: 'pair', label, muscle, value: d, unit: '% diff', score: scoreFromDiff(d),
      status: d < 2 ? 'great' : d < 4 ? 'good' : 'work', weaker,
      tip: d < 2 ? 'Beautifully balanced.' : `${weaker ? weaker[0].toUpperCase() + weaker.slice(1) : 'One'} side is ${round(d, 1)}% smaller. Start sets on the weaker side and match reps with single-arm / single-leg work.`,
    });
  }
  if (m.shoulders && m.waist) {
    const ideal = sex === 'female' ? 1.4 : 1.618;
    const r = m.shoulders / m.waist;
    items.push({
      id: 'vtaper', kind: 'ratio', label: sex === 'female' ? 'Shoulder : waist' : 'V-taper (shoulder : waist)', value: r, ideal, unit: ' : 1', score: scoreFromRatio(r, ideal, 3, 22),
      status: r >= ideal * 0.97 ? 'great' : r >= ideal * 0.9 ? 'good' : 'work', muscle: 'shoulders',
      tip: r >= ideal * 0.97 ? 'Excellent taper.' : 'Build width: lateral raises, pull-ups / lat pulldowns, and keep the waist tight.',
    });
  }
  if (m.chest && m.waist && sex !== 'female') {
    const r = m.chest / m.waist;
    items.push({ id: 'chestwaist', kind: 'ratio', label: 'Chest : waist', value: r, ideal: 1.4, unit: ' : 1', score: scoreFromRatio(r, 1.4, 4, 22), status: r >= 1.36 ? 'great' : r >= 1.25 ? 'good' : 'work', muscle: 'chest', tip: r >= 1.36 ? 'Strong upper-body proportions.' : 'Prioritise chest and back volume; avoid excess waist growth.' });
  }
  if (sex === 'female' && m.waist && m.hips) {
    const r = m.waist / m.hips;
    items.push({ id: 'whr', kind: 'ratio', label: 'Waist : hip', value: r, ideal: 0.72, unit: '', score: scoreFromRatio(r, 0.72, 5, 25), status: r <= 0.75 ? 'great' : r <= 0.82 ? 'good' : 'work', muscle: 'glutes', tip: r <= 0.75 ? 'Classic hourglass proportions.' : 'Glute and shoulder work plus a small waist reduction improve the curve.' });
  } else if (m.waist && m.hips) {
    const r = m.waist / m.hips;
    items.push({ id: 'whr', kind: 'ratio', label: 'Waist : hip', value: r, ideal: 0.85, unit: '', score: scoreFromRatio(r, 0.85, 5, 25), status: r <= 0.9 ? 'great' : r <= 0.95 ? 'good' : 'work', muscle: 'abs', tip: r <= 0.9 ? 'Healthy waist-to-hip ratio.' : 'Waist is carrying extra size – a small fat loss phase will sharpen proportions.' });
  }
  const bcn = [m.bicepL ?? m.bicepR, m.calfL ?? m.calfR, m.neck].filter(Boolean);
  if (bcn.length === 3) {
    const mean = avg(bcn);
    const spread = ((Math.max(...bcn) - Math.min(...bcn)) / mean) * 100;
    const names = ['Arms', 'Calves', 'Neck'];
    const low = names[bcn.indexOf(Math.min(...bcn))];
    items.push({ id: 'abc', kind: 'balance', label: 'Arms · Calves · Neck', value: spread, unit: '% spread', score: scoreFromDiff(spread, 4, 20), status: spread < 6 ? 'great' : spread < 12 ? 'good' : 'work', muscle: low === 'Arms' ? 'biceps' : low === 'Calves' ? 'calves' : 'traps', tip: spread < 6 ? 'Classic old-school balance.' : `${low} lag behind the others – bring them up to match.` });
  }
  if (m.thighL && m.waist) {
    const r = ((m.thighL + (m.thighR || m.thighL)) / 2) / m.waist;
    items.push({ id: 'thighwaist', kind: 'ratio', label: 'Thigh : waist', value: r, ideal: 0.7, unit: ' : 1', score: scoreFromRatio(r, 0.7, 6, 30), status: r >= 0.66 ? 'great' : r >= 0.58 ? 'good' : 'work', muscle: 'quads', tip: r >= 0.66 ? 'Legs are keeping pace with your upper body.' : 'Add leg volume – squats, leg press and lunges – to balance the physique.' });
  }
  const overall = items.length ? Math.round(avg(items, (i) => i.score)) : null;
  const focus = [...new Set(items.filter((i) => i.status === 'work').map((i) => i.muscle))];
  return { items, overall, focus };
}

// ---------- trends ----------
/** Time-aware exponential moving average. points: [{d:'YYYY-MM-DD', v:number}] sorted asc. */
export function trendSeries(points, perDay = 0.12) {
  const out = [];
  let t = null, lastD = null;
  for (const p of points) {
    if (t == null) t = p.v;
    else {
      const gap = Math.max(1, daysBetween(lastD, p.d));
      const a = 1 - (1 - perDay) ** gap;
      t = t + (p.v - t) * a;
    }
    lastD = p.d;
    out.push({ d: p.d, v: p.v, t });
  }
  return out;
}

/** Estimate real maintenance calories from logged intake and weight change. */
export function adaptiveTdee({ weights, intakeByDay, today: end, windowDays = 21 }) {
  const start = addDays(end, -windowDays + 1);
  const days = Object.keys(intakeByDay).filter((d) => d >= start && d <= end && intakeByDay[d] > 600);
  const w = weights.filter((x) => x.d >= start && x.d <= end);
  if (days.length < 10 || w.length < 3) return null;
  const span = daysBetween(w[0].d, w[w.length - 1].d);
  if (span < 10) return null;
  const tr = trendSeries(w.map((x) => ({ d: x.d, v: x.kg })));
  const slopePerDay = (tr[tr.length - 1].t - tr[0].t) / span; // kg/day
  const intake = avg(days, (d) => intakeByDay[d]);
  const est = intake - slopePerDay * 7700;
  return { tdee: Math.round(clamp(est, 1000, 5000)), intake: Math.round(intake), kgPerWeek: slopePerDay * 7, days: days.length };
}

export const kgPerWeekToLabel = (kgw, units) => {
  const v = units === 'imperial' ? kgw * 2.20462 : kgw;
  return `${v > 0 ? '+' : ''}${round(v, 2)} ${units === 'imperial' ? 'lb' : 'kg'}/wk`;
};
export { parseDay };
