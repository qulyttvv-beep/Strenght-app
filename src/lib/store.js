// App state: a handful of independent "slices" persisted separately to IndexedDB (see db.js).
// Components read with useStore(); mutate with update(slice, draft => {...}) or the named actions below.
import { useSyncExternalStore } from 'preact/compat';
import { kvAll, kvSet, kvClear, photoPut, photoDel, photoAll, photoClear, requestPersistence } from './db.js';
import { processPhoto, blobToDataUrl, dataUrlToBlob, dropUrl } from './image.js';
import { uid, today, round, debounce } from './util.js';
import { ageFromBirthdate, computeTargets, epley1RM, isMinor } from './calc.js';
import { registerCustom, getExercise } from './exercises.js';
import { defaultAiSettings } from './ai.js';
import { generateProgram } from './generator.js';

export const defaults = () => ({
  profile: {
    onboarded: false, name: '', sex: 'male', birthdate: null, heightCm: 175, units: 'metric',
    activity: 'moderate', goal: 'maintain', goalWeightKg: null, goalBfPct: null, rateKgPerWeek: 0.5,
    experience: 'beginner', daysPerWeek: 3, minutes: 60, equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
    wristCm: null, ankleCm: null, customTargets: null,
  },
  settings: { accent: 'volt', restSec: 90, haptics: true, autoRest: true, ai: defaultAiSettings(), photoLock: null },
  weights: [], // {d, kg}
  bodyfat: [], // {d, pct, method}
  measures: [], // {d, ...cm}
  food: { logs: {}, custom: [], favs: [], recents: [], water: {} },
  routines: [],
  program: null,
  history: [],
  active: null,
  customEx: [],
  photos: [], // meta only; blobs in IndexedDB
  chat: [],
});

let state = defaults();
let ready = false;
const subs = new Set();
const dirty = new Set();
const notify = () => subs.forEach((f) => f());
export const getState = () => state;
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const useStore = () => useSyncExternalStore(subscribe, getState);
export const isReady = () => ready;

const persist = debounce(async () => {
  const slices = [...dirty]; dirty.clear();
  for (const s of slices) { try { await kvSet(s, state[s]); } catch (e) { console.error('persist failed', s, e); dirty.add(s); } }
}, 350);
export const flushPersist = () => persist.flush();

export function update(slice, fn) {
  const draft = structuredClone(state[slice]);
  const res = fn(draft);
  state = { ...state, [slice]: res === undefined ? draft : res };
  dirty.add(slice);
  if (slice === 'customEx') registerCustom(state.customEx);
  notify();
  persist();
}
export const setProfile = (patch) => update('profile', (p) => Object.assign(p, patch));
export const setSettings = (patch) => update('settings', (s) => Object.assign(s, patch));
export const setAi = (patch) => update('settings', (s) => { s.ai = { ...s.ai, ...patch }; });

const deepMerge = (base, extra) => {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return extra === undefined ? base : extra;
  const out = { ...base };
  for (const k of Object.keys(extra || {})) out[k] = k in base && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? deepMerge(base[k], extra[k]) : extra[k];
  return out;
};

export async function initStore() {
  let saved = {};
  try { saved = await kvAll(); } catch (e) { console.error('load failed', e); }
  const d = defaults();
  const next = {};
  for (const k of Object.keys(d)) next[k] = saved[k] === undefined ? d[k] : (typeof d[k] === 'object' && !Array.isArray(d[k]) && d[k] !== null ? deepMerge(d[k], saved[k]) : saved[k]);
  state = next;
  registerCustom(state.customEx);
  ready = true;
  requestPersistence();
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist.flush(); });
  addEventListener('pagehide', () => persist.flush());
  notify();
}

// ---------- derived helpers ----------
export const getAge = (profile = state.profile) => ageFromBirthdate(profile.birthdate);
export const sortedWeights = (s = state) => [...s.weights].sort((a, b) => (a.d < b.d ? -1 : 1));
export const latestWeight = (s = state) => { const w = sortedWeights(s); return w.length ? w[w.length - 1] : null; };
export const latestBodyFat = (s = state) => { const b = [...s.bodyfat].sort((x, y) => (x.d < y.d ? -1 : 1)); return b.length ? b[b.length - 1] : null; };
export function latestMeasures(s = state) {
  const out = {};
  for (const m of [...s.measures].sort((a, b) => (a.d < b.d ? -1 : 1))) for (const [k, v] of Object.entries(m)) if (k !== 'd' && v != null) out[k] = v;
  return out;
}
export function currentTargets(s = state) {
  const p = s.profile;
  const w = latestWeight(s)?.kg ?? 70;
  const auto = computeTargets({ sex: p.sex, kg: w, cm: p.heightCm, age: getAge(p) ?? 25, activity: p.activity, goal: p.goal, rateKgPerWeek: p.rateKgPerWeek, bodyFatPct: latestBodyFat(s)?.pct });
  return p.customTargets ? { ...auto, ...p.customTargets, custom: true } : auto;
}

// ---------- body logs ----------
export const logWeight = (kg, d = today()) => update('weights', (w) => { const i = w.findIndex((x) => x.d === d); if (i >= 0) w[i].kg = kg; else w.push({ d, kg }); });
export const deleteWeight = (d) => update('weights', (w) => w.filter((x) => x.d !== d));
export const logBodyFat = (pct, method, d = today()) => update('bodyfat', (b) => { b.push({ id: uid(), d, pct: round(pct, 1), method }); });
export const deleteBodyFat = (id) => update('bodyfat', (b) => b.filter((x) => x.id !== id));
export const logMeasures = (vals, d = today()) => update('measures', (m) => {
  const clean = Object.fromEntries(Object.entries(vals).filter(([, v]) => v != null && v > 0));
  const i = m.findIndex((x) => x.d === d);
  if (i >= 0) Object.assign(m[i], clean); else m.push({ d, ...clean });
});

// ---------- food ----------
export const dayEntries = (s, date) => s.food.logs[date] || [];
export function addFoodEntries(date, entries) {
  update('food', (f) => {
    f.logs[date] = [...(f.logs[date] || []), ...entries];
    for (const e of entries) {
      f.recents = [{ name: e.name, unit: e.unit, baseGrams: e.baseGrams, base: e.base, src: e.src }, ...f.recents.filter((r) => !(r.name === e.name && r.unit === e.unit))].slice(0, 40);
    }
  });
}
export const updateFoodEntry = (date, id, patch) => update('food', (f) => { const e = (f.logs[date] || []).find((x) => x.id === id); if (e) Object.assign(e, patch); });
export const removeFoodEntry = (date, id) => update('food', (f) => { f.logs[date] = (f.logs[date] || []).filter((x) => x.id !== id); });
export const addWater = (date, ml) => update('food', (f) => { f.water[date] = Math.max(0, (f.water[date] || 0) + ml); });
export const saveCustomFood = (food) => update('food', (f) => { const i = f.custom.findIndex((x) => x.id === food.id); if (i >= 0) f.custom[i] = food; else f.custom.unshift(food); });
export const deleteCustomFood = (id) => update('food', (f) => { f.custom = f.custom.filter((x) => x.id !== id); });
export const copyDay = (from, to, meals) => update('food', (f) => {
  const src = (f.logs[from] || []).filter((e) => !meals || meals.includes(e.meal));
  f.logs[to] = [...(f.logs[to] || []), ...src.map((e) => ({ ...e, id: uid(), t: Date.now() }))];
});

// ---------- workouts ----------
const defaultSetCount = 3;
export function bestPrevious(s, exId) {
  // most recent performance of this exercise (done sets)
  for (const h of s.history) {
    const ex = h.exercises.find((e) => e.exId === exId);
    if (ex && ex.sets.length) return { date: h.date, sets: ex.sets };
  }
  return null;
}

export function startWorkout({ name = 'Workout', routine = null, exercises = null } = {}) {
  if (state.active) return;
  const list = routine ? routine.exercises : exercises || [];
  const ex = list.map((r) => makeActiveExercise(r.exId, r));
  const active = { id: uid(), name: routine?.name || name, routineId: routine?.id || null, startedAt: Date.now(), notes: '', exercises: ex };
  update('active', () => active);
}
function makeActiveExercise(exId, tpl = {}) {
  const def = getExercise(exId);
  const prev = bestPrevious(state, exId);
  const n = tpl.sets || (prev ? prev.sets.length : defaultSetCount);
  const sets = Array.from({ length: n }, (_, i) => {
    const p = prev?.sets[Math.min(i, prev.sets.length - 1)] || null;
    return {
      id: uid() + i, kind: 'normal', done: false,
      w: p?.w ?? null, r: p?.r ?? null, t: p?.t ?? null, m: p?.m ?? null, d: p?.d ?? null,
      prev: prev?.sets[i] ? { w: prev.sets[i].w, r: prev.sets[i].r, t: prev.sets[i].t, m: prev.sets[i].m, d: prev.sets[i].d } : null,
    };
  });
  return { key: uid(), exId, note: tpl.note || '', rest: tpl.rest ?? (def.mech === 'compound' ? Math.max(state.settings.restSec, 120) : state.settings.restSec), target: tpl.repMin ? `${tpl.repMin}${tpl.repMax && tpl.repMax !== tpl.repMin ? '–' + tpl.repMax : ''}` : null, sets };
}
export const addExerciseToActive = (exId, tpl) => update('active', (a) => { if (a) a.exercises.push(makeActiveExercise(exId, tpl)); });
export const removeExerciseFromActive = (key) => update('active', (a) => { if (a) a.exercises = a.exercises.filter((e) => e.key !== key); });
export const moveActiveExercise = (key, dir) => update('active', (a) => {
  if (!a) return;
  const i = a.exercises.findIndex((e) => e.key === key), j = i + dir;
  if (i < 0 || j < 0 || j >= a.exercises.length) return;
  [a.exercises[i], a.exercises[j]] = [a.exercises[j], a.exercises[i]];
});
export const replaceActiveExercise = (key, exId) => update('active', (a) => { const i = a?.exercises.findIndex((e) => e.key === key); if (i >= 0) a.exercises[i] = { ...makeActiveExercise(exId, { rest: a.exercises[i].rest }), key }; });
export const updateActiveExercise = (key, patch) => update('active', (a) => { const e = a?.exercises.find((x) => x.key === key); if (e) Object.assign(e, patch); });
export const updateActiveSet = (key, setId, patch) => update('active', (a) => {
  const s = a?.exercises.find((x) => x.key === key)?.sets.find((x) => x.id === setId);
  if (s) Object.assign(s, patch);
});
export const addActiveSet = (key) => update('active', (a) => {
  const e = a?.exercises.find((x) => x.key === key);
  if (!e) return;
  const last = e.sets[e.sets.length - 1];
  e.sets.push({ id: uid(), kind: 'normal', done: false, w: last?.w ?? null, r: last?.r ?? null, t: last?.t ?? null, m: last?.m ?? null, d: last?.d ?? null, prev: null });
});
export const removeActiveSet = (key, setId) => update('active', (a) => { const e = a?.exercises.find((x) => x.key === key); if (e) e.sets = e.sets.filter((s) => s.id !== setId); });
export const setActiveMeta = (patch) => update('active', (a) => { if (a) Object.assign(a, patch); });
export const discardWorkout = () => update('active', () => null);

const setScore = (ex, s) => (ex.type === 'wr' ? epley1RM(s.w, s.r) : ex.type === 'br' ? (s.r || 0) + (s.w || 0) * 0.01 : 0);

/** Records across history: per exercise best weight / e1RM / reps. */
export function computeRecords(history) {
  const rec = {};
  for (const h of history) for (const e of h.exercises) {
    const r = (rec[e.exId] ??= { weight: 0, e1rm: 0, reps: 0, volume: 0 });
    for (const s of e.sets) {
      if (s.kind === 'warmup') continue;
      r.weight = Math.max(r.weight, s.w || 0);
      r.e1rm = Math.max(r.e1rm, epley1RM(s.w, s.r));
      r.reps = Math.max(r.reps, s.r || 0);
      r.volume = Math.max(r.volume, (s.w || 0) * (s.r || 0));
    }
  }
  return rec;
}

export function finishWorkout() {
  const a = state.active;
  if (!a) return null;
  const prior = computeRecords(state.history);
  const exercises = [];
  const prs = [];
  for (const ex of a.exercises) {
    const def = getExercise(ex.exId);
    const sets = ex.sets.filter((s) => s.done).map(({ id, prev, done, ...rest }) => rest);
    if (!sets.length) continue;
    const rec = { exId: ex.exId, note: ex.note, sets, prs: [] };
    if (def.type === 'wr' || def.type === 'br') {
      const p = prior[ex.exId];
      const working = sets.filter((s) => s.kind !== 'warmup');
      const bestW = Math.max(0, ...working.map((s) => s.w || 0));
      const bestE = Math.max(0, ...working.map((s) => epley1RM(s.w, s.r)));
      const bestR = Math.max(0, ...working.map((s) => s.r || 0));
      if (def.type === 'wr') {
        if (bestW > 0 && (!p || bestW > p.weight)) rec.prs.push('weight');
        if (bestE > 0 && (!p || bestE > p.e1rm * 1.001)) rec.prs.push('1rm');
      } else if (bestR > 0 && (!p || bestR > p.reps)) rec.prs.push('reps');
      if (p && rec.prs.length) prs.push({ exId: ex.exId, types: rec.prs, e1rm: bestE, weight: bestW, reps: bestR });
      else if (!p && working.length) rec.prs = []; // first time doing it is not a "record"
    }
    exercises.push(rec);
  }
  if (!exercises.length) { update('active', () => null); return null; }
  const endedAt = Date.now();
  const volume = exercises.reduce((t, e) => t + e.sets.reduce((v, s) => v + (s.kind === 'warmup' ? 0 : (s.w || 0) * (s.r || 0)), 0), 0);
  const item = {
    id: a.id, name: a.name, routineId: a.routineId, date: today(), startedAt: a.startedAt, endedAt, durationSec: Math.round((endedAt - a.startedAt) / 1000),
    notes: a.notes, exercises, volume: Math.round(volume), sets: exercises.reduce((t, e) => t + e.sets.length, 0), prCount: exercises.reduce((t, e) => t + e.prs.length, 0),
  };
  update('history', (h) => { h.unshift(item); });
  update('active', () => null);
  return { item, prs };
}
export const deleteWorkout = (id) => update('history', (h) => h.filter((x) => x.id !== id));

export const saveRoutine = (r) => update('routines', (list) => { const i = list.findIndex((x) => x.id === r.id); if (i >= 0) list[i] = r; else list.push(r); });
export const deleteRoutine = (id) => { update('routines', (l) => l.filter((r) => r.id !== id)); update('program', (p) => (p ? { ...p, routineIds: (p.routineIds || []).filter((x) => x !== id) } : p)); };
/** Install a generated/AI program: its routines become saved routines and the program rotation. */
export function installProgram(prog, { replace = true } = {}) {
  update('routines', (list) => {
    const keep = replace ? list.filter((r) => !r.programId) : list;
    return [...keep, ...prog.routines.map((r) => ({ ...r, programId: prog.id }))];
  });
  update('program', () => ({ id: prog.id, name: prog.name, goal: prog.goal, days: prog.routines.length, routineIds: prog.routines.map((r) => r.id), notes: prog.notes || [], createdAt: Date.now(), ai: !!prog.ai }));
}
export function nextRoutine(s = state) {
  const p = s.program;
  if (!p?.routineIds?.length) return s.routines[0] || null;
  const last = s.history.find((h) => p.routineIds.includes(h.routineId));
  const idx = last ? (p.routineIds.indexOf(last.routineId) + 1) % p.routineIds.length : 0;
  return s.routines.find((r) => r.id === p.routineIds[idx]) || null;
}
export const addCustomExercise = (ex) => update('customEx', (l) => { l.unshift(ex); });
export const deleteCustomExercise = (id) => update('customEx', (l) => l.filter((e) => e.id !== id));

// ---------- photos ----------
export async function addPhoto(file, { date = today(), pose = 'front', note = '' } = {}) {
  const { full, thumb, width, height } = await processPhoto(file);
  const id = uid();
  await photoPut({ id, full, thumb });
  const w = latestWeight()?.kg ?? null;
  update('photos', (p) => { p.unshift({ id, date, pose, note, weightKg: w, width, height, addedAt: Date.now() }); p.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.addedAt - a.addedAt)); });
  return id;
}
export async function deletePhoto(id) {
  await photoDel(id);
  dropUrl('t' + id); dropUrl('f' + id);
  update('photos', (p) => p.filter((x) => x.id !== id));
}
export const updatePhoto = (id, patch) => update('photos', (p) => { const x = p.find((q) => q.id === id); if (x) Object.assign(x, patch); });

// ---------- onboarding ----------
export function completeOnboarding({ profile, weightKg, bodyFatPct }) {
  update('profile', (p) => Object.assign(p, profile, { onboarded: true }));
  logWeight(weightKg);
  if (bodyFatPct) logBodyFat(bodyFatPct, 'manual');
  const prof = state.profile;
  const prog = generateProgram({ goal: prof.goal === 'lose' ? 'fatloss' : prof.goal === 'gain' ? 'muscle' : prof.goal === 'recomp' ? 'muscle' : 'general', days: prof.daysPerWeek, minutes: prof.minutes, equip: prof.equipment, experience: prof.experience });
  installProgram(prog);
}

// ---------- backup ----------
export async function exportBackup() {
  const photos = [];
  for (const p of await photoAll()) photos.push({ id: p.id, full: await blobToDataUrl(p.full), thumb: await blobToDataUrl(p.thumb) });
  const { active, ...rest } = state;
  return { app: 'forma', version: 1, exportedAt: new Date().toISOString(), data: rest, photos };
}
export async function importBackup(obj) {
  if (obj?.app !== 'forma' || !obj.data) throw new Error('This file is not a Forma backup.');
  await kvClear(); await photoClear();
  const d = defaults();
  for (const k of Object.keys(d)) await kvSet(k, obj.data[k] ?? d[k]);
  for (const p of obj.photos || []) await photoPut({ id: p.id, full: await dataUrlToBlob(p.full), thumb: await dataUrlToBlob(p.thumb) });
  await initStore();
}
export async function wipeAll() {
  await kvClear(); await photoClear();
  state = defaults(); registerCustom([]); dirty.clear(); notify();
}
export { isMinor };
