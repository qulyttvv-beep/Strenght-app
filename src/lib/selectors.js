// Derived data used by multiple screens.
import { entryTotals } from './foods.js';
import { getExercise } from './exercises.js';
import { addDays, today, weekStart, lastNDays, sum } from './util.js';
import { sortedWeights } from './store.js';

export function foodTotals(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const e of entries) { const x = entryTotals(e); t.kcal += x.kcal; t.p += x.p; t.c += x.c; t.f += x.f; }
  return { kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) };
}
export const dayTotals = (s, date) => foodTotals(s.food.logs[date] || []);

export function intakeByDay(s) {
  const out = {};
  for (const [d, list] of Object.entries(s.food.logs)) if (list.length) out[d] = foodTotals(list).kcal;
  return out;
}

export function activeDates(s) {
  const set = new Set();
  for (const h of s.history) set.add(h.date);
  for (const [d, list] of Object.entries(s.food.logs)) if (list.length) set.add(d);
  return set;
}
export function streak(s) {
  const act = activeDates(s);
  let d = today(), n = 0;
  if (!act.has(d)) d = addDays(d, -1); // today isn't over yet
  while (act.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
export const workoutDates = (s) => new Set(s.history.map((h) => h.date));

export function weekWorkouts(s, start = weekStart()) {
  const end = addDays(start, 6);
  return s.history.filter((h) => h.date >= start && h.date <= end);
}

/** Working sets per muscle: primary = 1 set, secondary = 0.5. */
export function muscleSets(workouts) {
  const out = {};
  for (const w of workouts) for (const e of w.exercises) {
    const def = getExercise(e.exId);
    const n = e.sets.filter((x) => x.kind !== 'warmup').length;
    if (!n) continue;
    out[def.muscle] = (out[def.muscle] || 0) + n;
    for (const m of def.sec || []) out[m] = (out[m] || 0) + n * 0.5;
  }
  return out;
}

export function weightPoints(s, days) {
  const all = sortedWeights(s);
  if (!days) return all;
  const from = addDays(today(), -days);
  return all.filter((w) => w.d >= from);
}

export function lastNDaysCalories(s, n = 7) {
  return lastNDays(n).map((d) => ({ d, kcal: dayTotals(s, d).kcal }));
}

/** Best estimated 1RM per tracked lift (by name pattern). */
export const LIFT_IDS = {
  squat: ['barbell-back-squat', 'front-squat', 'smith-machine-squat'],
  bench: ['barbell-bench-press', 'dumbbell-bench-press', 'incline-barbell-bench-press'],
  deadlift: ['deadlift', 'sumo-deadlift', 'romanian-deadlift'],
  ohp: ['overhead-press', 'seated-dumbbell-press'],
  row: ['barbell-row', 'pendlay-row', 't-bar-row'],
};
export function bestLifts(s, e1rm) {
  const out = {};
  const best = {};
  for (const h of s.history) for (const e of h.exercises) for (const set of e.sets) {
    if (set.kind === 'warmup' || !set.w || !set.r) continue;
    const v = e1rm(set.w, set.r);
    if (!best[e.exId] || v > best[e.exId]) best[e.exId] = v;
  }
  for (const [lift, ids] of Object.entries(LIFT_IDS)) {
    const id = ids.find((x) => best[x]);
    if (id) out[lift] = { exId: id, e1rm: best[id] };
  }
  return out;
}
export const sumBy = sum;
