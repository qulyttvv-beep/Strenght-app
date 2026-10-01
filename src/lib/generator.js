// Offline workout-program generator: picks a split from days/week, fills each day from movement-pattern slots,
// respecting equipment, goal, experience and session length. Deterministic; the AI planner is optional on top.
import { EXERCISES, getExercise } from './exercises.js';
import { uid } from './util.js';

export const PROGRAM_GOALS = [
  { id: 'muscle', label: 'Build muscle', hint: 'Hypertrophy focus, 6–15 reps' },
  { id: 'strength', label: 'Get stronger', hint: 'Heavier sets, longer rest' },
  { id: 'fatloss', label: 'Lose fat', hint: 'Higher reps + incline walking' },
  { id: 'general', label: 'General fitness', hint: 'Balanced and sustainable' },
];
export const EXPERIENCE = [
  { id: 'beginner', label: 'Beginner', hint: '< 1 year of lifting' },
  { id: 'intermediate', label: 'Intermediate', hint: '1–3 years' },
  { id: 'advanced', label: 'Advanced', hint: '3+ years' },
];
export const EQUIP_PRESETS = [
  { id: 'gym', label: 'Full gym', equip: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band'] },
  { id: 'dumbbells', label: 'Dumbbells at home', equip: ['dumbbell', 'bodyweight', 'band'] },
  { id: 'barbell', label: 'Barbell + rack', equip: ['barbell', 'dumbbell', 'bodyweight'] },
  { id: 'bodyweight', label: 'Bodyweight only', equip: ['bodyweight', 'band'] },
];

// ---- day templates (ordered by importance; the first N fit the session length) ----
const T = {
  fbA: ['squat', 'hpress', 'hrow', 'rdl', 'vpress', 'curl', 'tripush', 'plank', 'calf'],
  fbB: ['hinge', 'ipress', 'vpull', 'lunge', 'latraise', 'trioh', 'hammer', 'legraise', 'calf'],
  fbC: ['legpress', 'hpress', 'hrow', 'thrust', 'vpress', 'legcurl', 'curl', 'crunch', 'tripush'],
  upperA: ['hpress', 'hrow', 'vpress', 'vpull', 'curl', 'tripush', 'latraise', 'reardelt', 'crunch'],
  upperB: ['ipress', 'vpull', 'hrow', 'vpress', 'fly', 'hammer', 'trioh', 'reardelt', 'plank'],
  lowerA: ['squat', 'rdl', 'lunge', 'legcurl', 'calf', 'crunch', 'legext', 'plank', 'thrust'],
  lowerB: ['hinge', 'legpress', 'thrust', 'legext', 'legcurl', 'calf', 'legraise', 'lunge', 'plank'],
  push: ['hpress', 'ipress', 'vpress', 'latraise', 'fly', 'tripush', 'trioh', 'fraise', 'tripress'],
  pull: ['vpull', 'hrow', 'hrow', 'reardelt', 'curl', 'hammer', 'shrug', 'lat', 'curl'],
  legs: ['squat', 'rdl', 'legpress', 'legcurl', 'legext', 'calf', 'thrust', 'crunch', 'calf'],
  pushB: ['ipress', 'hpress', 'vpress', 'latraise', 'fly', 'trioh', 'tripush', 'fraise', 'dip'],
  pullB: ['hrow', 'vpull', 'vpull', 'reardelt', 'hammer', 'curl', 'shrug', 'lat', 'hammer'],
  legsB: ['hinge', 'squat', 'lunge', 'legcurl', 'legext', 'calf', 'thrust', 'legraise', 'calf'],
};
const FALLBACK = {
  squat: ['legpress', 'lunge'], legpress: ['squat', 'lunge'], lunge: ['squat', 'legpress'], hinge: ['rdl', 'thrust'], rdl: ['legcurl', 'thrust', 'hinge'],
  hpress: ['pushup', 'ipress', 'dip'], ipress: ['hpress', 'pushup'], fly: ['hpress', 'pushup'], hrow: ['vpull', 'lat'], vpull: ['hrow'], vpress: ['pushup', 'latraise'],
  latraise: ['fraise', 'reardelt'], reardelt: ['hrow', 'latraise'], curl: ['hammer', 'vpull'], hammer: ['curl'], tripush: ['trioh', 'dip', 'pushup', 'tripress'],
  trioh: ['tripush', 'dip', 'pushup'], tripress: ['tripush', 'pushup'], dip: ['tripush', 'pushup'], thrust: ['rdl', 'lunge'], legcurl: ['rdl', 'thrust'], legext: ['lunge', 'squat'],
  calf: ['calf'], plank: ['crunch', 'legraise', 'antiext'], crunch: ['plank', 'legraise', 'antiext'], legraise: ['crunch', 'plank'], shrug: ['reardelt', 'hrow'], lat: ['vpull', 'hrow'], fraise: ['latraise'],
};

function splitFor(days, experience, goal) {
  const d = Math.min(6, Math.max(2, days));
  if (d === 2) return { name: 'Full Body ×2', days: [['Full Body A', T.fbA], ['Full Body B', T.fbB]] };
  if (d === 3) {
    if (experience === 'beginner' || goal === 'fatloss' || goal === 'general') return { name: 'Full Body ×3', days: [['Full Body A', T.fbA], ['Full Body B', T.fbB], ['Full Body C', T.fbC]] };
    return { name: 'Push / Pull / Legs', days: [['Push', T.push], ['Pull', T.pull], ['Legs', T.legs]] };
  }
  if (d === 4) return { name: 'Upper / Lower', days: [['Upper A', T.upperA], ['Lower A', T.lowerA], ['Upper B', T.upperB], ['Lower B', T.lowerB]] };
  if (d === 5) return { name: 'Upper / Lower + PPL', days: [['Upper', T.upperA], ['Lower', T.lowerA], ['Push', T.push], ['Pull', T.pull], ['Legs', T.legs]] };
  return { name: 'Push / Pull / Legs ×2', days: [['Push A', T.push], ['Pull A', T.pull], ['Legs A', T.legs], ['Push B', T.pushB], ['Pull B', T.pullB], ['Legs B', T.legsB]] };
}

const exerciseCount = (minutes) => (minutes <= 30 ? 4 : minutes <= 45 ? 5 : minutes <= 60 ? 7 : minutes <= 75 ? 8 : 9);

function scheme(ex, role, goal, exp, idx) {
  // role: 'main' | 'compound' | 'accessory'
  const lvl = exp === 'beginner' ? 0 : exp === 'intermediate' ? 1 : 2;
  const base = (a, b, c) => [a, b, c][lvl];
  if (ex.type === 'cardio') return { sets: 1, repMin: 10, repMax: 20, rest: 0 };
  if (ex.type === 'time') return { sets: base(2, 3, 3), repMin: 30, repMax: 60, rest: 45 };
  if (ex.type === 'br') {
    if (ex.muscle === 'abs') return { sets: base(2, 3, 3), repMin: 10, repMax: 20, rest: 60 };
    return { sets: base(2, 3, 4), repMin: 6, repMax: 15, rest: 90 };
  }
  if (goal === 'strength') {
    if (role === 'main') return { sets: base(3, 4, 5), repMin: 3, repMax: 5, rest: 180 };
    if (role === 'compound') return { sets: base(3, 3, 4), repMin: 5, repMax: 8, rest: 150 };
    return { sets: base(2, 3, 3), repMin: 8, repMax: 12, rest: 90 };
  }
  if (goal === 'fatloss' || goal === 'general') {
    if (role === 'main') return { sets: base(3, 3, 4), repMin: 6, repMax: 10, rest: 120 };
    if (role === 'compound') return { sets: base(2, 3, 3), repMin: 8, repMax: 12, rest: 90 };
    return { sets: base(2, 3, 3), repMin: 12, repMax: 15, rest: 60 };
  }
  // muscle
  if (role === 'main') return { sets: base(3, 4, 4), repMin: 5, repMax: 8, rest: 150 };
  if (role === 'compound') return { sets: base(3, 3, 4), repMin: 8, repMax: 12, rest: 120 };
  return { sets: base(2, 3, 3), repMin: 10, repMax: 15, rest: 75 };
}

export function generateProgram({ goal = 'muscle', days = 3, minutes = 60, equip = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'], experience = 'beginner', focus = [], name } = {}) {
  const allowed = new Set([...equip, 'bodyweight', 'other']);
  const split = splitFor(days, experience, goal);
  const N = exerciseCount(minutes);
  const routines = [];
  const lastUsed = {}; // rotate variants across days so repeated patterns pick different exercises

  split.days.forEach(([dayName, slots], di) => {
    const used = new Set();
    const picks = [];
    const want = slots.slice(0, N);
    for (let si = 0; si < want.length; si++) {
      const pat = want[si];
      const ex = pick(pat, allowed, used, lastUsed);
      if (ex) { used.add(ex.id); picks.push({ ex, pat }); }
    }
    // weak-point focus: add one isolation for each focus muscle that this day does not already train hard
    for (const m of focus) {
      if (picks.some((p) => p.ex.muscle === m)) { if (picks.filter((p) => p.ex.muscle === m).length >= 2) continue; }
      const day = dayName.toLowerCase();
      const relevant = ['upper', 'full', 'push', 'pull', 'legs', 'lower'].some((k) => day.includes(k)) && trainsOnDay(m, day);
      if (!relevant) continue;
      const cands = EXERCISES.filter((e) => e.muscle === m && e.mech === 'isolation' && allowed.has(e.equip) && !used.has(e.id) && e.type !== 'cardio').sort((a, b) => a.pri - b.pri);
      if (cands[0]) {
        const at = Math.max(2, picks.length - 2);
        picks.splice(at, 0, { ex: cands[0], pat: cands[0].pat, extra: true });
        used.add(cands[0].id);
        if (picks.length > N + 1) picks.pop();
      }
    }
    const ex = picks.map(({ ex }, i) => {
      const role = i === 0 ? 'main' : ex.mech === 'compound' && i < 4 ? 'compound' : 'accessory';
      const s = scheme(ex, role, goal, experience, i);
      return { exId: ex.id, sets: s.sets, repMin: s.repMin, repMax: s.repMax, rest: s.rest, note: '' };
    });
    if (goal === 'fatloss' && allowed.has('machine')) {
      const w = EXERCISES.find((e) => e.id === 'treadmill-walk-incline');
      if (w) ex.push({ exId: w.id, sets: 1, repMin: 10, repMax: 15, rest: 0, note: 'Finisher: 10–15 min' });
    } else if (goal === 'fatloss') {
      ex.push({ exId: 'walking', sets: 1, repMin: 10, repMax: 20, rest: 0, note: 'Finisher: brisk walk' });
    }
    routines.push({ id: uid() + di, name: dayName, exercises: ex, notes: '' });
  });

  const notes = [
    'Double progression: when you hit the top of the rep range on every set, add the smallest weight jump next session.',
    'Leave 1–3 reps in the tank on most sets; go closer to failure on the last set of isolation moves.',
    'Every 6–8 weeks (or when progress stalls) take an easier “deload” week with ~half the sets.',
  ];
  return {
    id: uid(), name: name || `${split.name} · ${PROGRAM_GOALS.find((g) => g.id === goal)?.label}`, goal, days, minutes, experience, equip,
    split: split.name, routines, notes, createdAt: Date.now(),
  };
}

function trainsOnDay(m, day) {
  const map = { chest: ['push', 'upper', 'full'], shoulders: ['push', 'upper', 'full'], triceps: ['push', 'upper', 'full'], back: ['pull', 'upper', 'full'], biceps: ['pull', 'upper', 'full'], traps: ['pull', 'upper'], forearms: ['pull', 'upper', 'full'], quads: ['legs', 'lower', 'full'], hamstrings: ['legs', 'lower', 'full'], glutes: ['legs', 'lower', 'full'], calves: ['legs', 'lower', 'full'], abs: ['legs', 'lower', 'full', 'upper'] };
  return (map[m] || []).some((k) => day.includes(k));
}

const BW_NATURAL = new Set(['vpull', 'dip', 'pushup', 'plank', 'crunch', 'legraise', 'hang', 'antiext', 'rollout', 'extension']);
const EQUIP_RANK = { barbell: 0, machine: 1, dumbbell: 1, cable: 1, kettlebell: 2, band: 3, other: 3, bodyweight: 2 };

function pick(pat, allowed, used, lastUsed) {
  const loaded = ['barbell', 'dumbbell', 'machine', 'cable'].some((e) => allowed.has(e));
  // maxPri 2 first (common movements, incl. fallbacks), only then niche (pri 3) ones
  for (const maxPri of [2, 3]) {
    for (const p of [pat, ...(FALLBACK[pat] || [])]) {
      const cands = EXERCISES.filter((e) => e.pat === p && e.pri <= maxPri && allowed.has(e.equip) && !used.has(e.id))
        .map((e) => ({ e, score: e.pri * 10 + (loaded && e.equip === 'bodyweight' && !BW_NATURAL.has(p) ? 25 : EQUIP_RANK[e.equip] ?? 2) }))
        .sort((a, b) => a.score - b.score || a.e.name.localeCompare(b.e.name));
      if (!cands.length) continue;
      // keep only the best-ranked tier, then rotate through it across days for variety
      const pool = cands.filter((c) => c.score <= cands[0].score + 5).map((c) => c.e);
      const prev = lastUsed[p] ?? -1;
      const choice = pool[(prev + 1) % pool.length];
      lastUsed[p] = pool.indexOf(choice);
      return choice;
    }
  }
  return null;
}

export const estimateMinutes = (routine) => {
  let t = 0;
  for (const e of routine.exercises) {
    const ex = getExercise(e.exId);
    if (ex.type === 'cardio') t += (e.repMin || 10) * 60;
    else t += e.sets * ((ex.type === 'time' ? e.repMax : 40) + (e.rest || 60));
  }
  return Math.round(t / 60 / 5) * 5 + 5; // + warm-up
};

/** Validate/clean a program returned by an LLM. Unknown exercise ids are dropped; returns null if nothing usable. */
export function sanitizeAiProgram(raw, fallbackName = 'AI program') {
  if (!raw || !Array.isArray(raw.routines)) return null;
  const known = new Set(EXERCISES.map((e) => e.id));
  const routines = [];
  raw.routines.slice(0, 7).forEach((r, i) => {
    const exercises = (r.exercises || []).map((e) => {
      const id = String(e.exId || e.id || '').trim();
      if (!known.has(id)) return null;
      const ex = getExercise(id);
      const sets = Math.min(8, Math.max(1, Math.round(+e.sets || 3)));
      let repMin = Math.round(+e.repMin || +e.reps || 8), repMax = Math.round(+e.repMax || +e.reps || repMin + 4);
      if (repMax < repMin) repMax = repMin;
      const rest = Math.min(300, Math.max(0, Math.round(+e.rest || (ex.mech === 'compound' ? 120 : 75))));
      return { exId: id, sets, repMin, repMax, rest, note: String(e.note || '').slice(0, 120) };
    }).filter(Boolean).slice(0, 12);
    if (exercises.length) routines.push({ id: uid() + i, name: String(r.name || `Day ${i + 1}`).slice(0, 40), exercises, notes: String(r.notes || '').slice(0, 200) });
  });
  if (!routines.length) return null;
  return { id: uid(), name: String(raw.name || fallbackName).slice(0, 60), goal: raw.goal || 'general', days: routines.length, routines, notes: Array.isArray(raw.notes) ? raw.notes.slice(0, 5).map(String) : [], createdAt: Date.now(), ai: true };
}
