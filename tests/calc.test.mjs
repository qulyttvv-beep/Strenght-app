// Pure-maths tests: node --test tests/calc.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/lib/calc.js';
import { generateProgram, sanitizeAiProgram } from '../src/lib/generator.js';
import { normalizeMeal, extractJson } from '../src/lib/ai.js';
import { EXERCISES } from '../src/lib/exercises.js';
import { FOODS, searchFoods, entryFromFood, entryTotals } from '../src/lib/foods.js';

const near = (got, want, tol, msg) => assert.ok(Math.abs(got - want) <= tol, `${msg || ''} got ${got}, want ${want} ±${tol}`);

test('minimum age is 13 and boundaries are exact', () => {
  assert.equal(c.MIN_AGE, 13);
  const now = new Date('2026-10-01T12:00:00');
  assert.equal(c.ageFromBirthdate('2013-10-02', now), 12); // day before 13th birthday -> blocked
  assert.equal(c.ageFromBirthdate('2013-10-01', now), 13); // on the 13th birthday -> allowed
  assert.equal(c.ageFromBirthdate('2008-10-01', now), 18);
  assert.equal(c.ageFromBirthdate('2008-10-02', now), 17);
  assert.equal(c.isMinor(17), true);
  assert.equal(c.isMinor(18), false);
});

test('body fat formulas match hand-computed values', () => {
  near(c.navyBodyFat({ sex: 'male', cm: 178, neckCm: 38, waistCm: 85 }), 16.44, 0.05, 'Navy male');
  near(c.navyBodyFat({ sex: 'female', cm: 165, neckCm: 32, waistCm: 72, hipCm: 98 }), 27.43, 0.05, 'Navy female');
  assert.equal(c.navyBodyFat({ sex: 'male', cm: 178, neckCm: 40, waistCm: 38 }), null, 'waist <= neck is invalid');
  near(c.cunBae({ sex: 'male', kg: 25 * 1.8 ** 2, cm: 180, age: 30 }), 22.09, 0.05, 'CUN-BAE male');
  near(c.cunBae({ sex: 'female', kg: 22 * 1.65 ** 2, cm: 165, age: 30 }), 29.4, 0.05, 'CUN-BAE female');
  // Jackson-Pollock 3-site: S=60, age 30 male -> density 1.057816 -> 17.95%
  near(c.skinfoldBodyFat({ sex: 'male', age: 30, a: 20, b: 25, c: 15 }), 17.95, 0.05, 'JP3 male');
});

test('calorie targets: adult maths and safety floors', () => {
  assert.equal(Math.round(c.bmr({ sex: 'male', kg: 80, cm: 180, age: 30 })), 1780);
  const lose = c.computeTargets({ sex: 'male', kg: 80, cm: 180, age: 30, activity: 'moderate', goal: 'lose', rateKgPerWeek: 0.5 });
  assert.ok(lose.kcal < lose.maintenance && lose.delta <= -500 && lose.delta >= -600);
  assert.ok(lose.protein >= 150 && lose.protein <= 170);
  // adult floor
  const crash = c.computeTargets({ sex: 'female', kg: 50, cm: 155, age: 40, activity: 'sedentary', goal: 'lose', rateKgPerWeek: 1 });
  assert.ok(crash.kcal >= 1200, 'never below 1200 for adults');
});

test('teen safety: capped deficit, higher floors, no aggressive cutting', () => {
  const teen = c.computeTargets({ sex: 'female', kg: 50, cm: 160, age: 14, activity: 'light', goal: 'lose', rateKgPerWeek: 0.75 });
  assert.ok(teen.kcal >= 1600, 'teen girl floor 1600');
  assert.ok(teen.maintenance - teen.kcal <= teen.maintenance * 0.1 + 1, 'deficit capped at 10%');
  const boy = c.computeTargets({ sex: 'male', kg: 60, cm: 170, age: 15, activity: 'light', goal: 'lose', rateKgPerWeek: 0.75 });
  assert.ok(boy.kcal >= 1800, 'teen boy floor 1800');
  assert.ok(teen.notes.length > 0, 'explains the safety adjustment');
});

test('goal checker: realistic vs impossible, and teens get no potential estimate', () => {
  const base = { sex: 'male', age: 25, heightCm: 178, weightKg: 75, bfPct: 15, wristCm: 17.8, ankleCm: 22.9 };
  const ok = c.checkGoal({ ...base, goalWeightKg: 78, goalBfPct: 14 });
  assert.ok(['ok', 'ambitious'].includes(ok.verdict));
  const silly = c.checkGoal({ ...base, goalWeightKg: 110, goalBfPct: 10 });
  assert.equal(silly.verdict, 'unrealistic');
  const tooLean = c.checkGoal({ ...base, goalWeightKg: 70, goalBfPct: 4 });
  assert.equal(tooLean.verdict, 'unrealistic');
  const teen = c.checkGoal({ ...base, age: 15, goalWeightKg: 80, goalBfPct: 14 });
  assert.equal(teen.minor, true);
  assert.equal(teen.monthlyGainNow, undefined);
});

test('strength standards and symmetry', () => {
  const lv = c.strengthLevel('bench', 'male', 80, c.epley1RM(100, 5));
  assert.equal(lv.level, 'Intermediate');
  const rep = c.symmetryReport({ sex: 'male', m: { shoulders: 120, waist: 80, bicepL: 36, bicepR: 38, thighL: 58, thighR: 59 } });
  assert.ok(rep.overall > 0 && rep.overall <= 100);
  assert.ok(rep.focus.includes('biceps'), 'flags the 5.3% biceps difference');
});

test('adaptive TDEE needs enough data and reflects weight change', () => {
  const weights = [], intake = {};
  for (let i = 0; i < 21; i++) { const d = `2026-09-${String(i + 1).padStart(2, '0')}`; if (i % 3 === 0) weights.push({ d, kg: 80 - i * 0.05 }); intake[d] = 2500; }
  const r = c.adaptiveTdee({ weights, intakeByDay: intake, today: '2026-09-21' });
  assert.ok(r && r.tdee > 2500, 'losing weight on 2500 => maintenance above intake');
  assert.equal(c.adaptiveTdee({ weights: weights.slice(0, 2), intakeByDay: intake, today: '2026-09-21' }), null);
});

test('exercise library & generator are internally consistent', () => {
  const ids = new Set(EXERCISES.map((e) => e.id));
  assert.equal(ids.size, EXERCISES.length, 'unique ids');
  for (const goal of ['muscle', 'strength', 'fatloss', 'general']) for (const days of [2, 3, 4, 5, 6]) {
    const p = generateProgram({ goal, days, minutes: 60, equip: ['dumbbell', 'bodyweight'], experience: 'beginner' });
    assert.equal(p.routines.length, days);
    for (const r of p.routines) { assert.ok(r.exercises.length >= 3); for (const e of r.exercises) assert.ok(ids.has(e.exId), e.exId); }
  }
  const p = generateProgram({ goal: 'muscle', days: 4, minutes: 60, equip: ['bodyweight'], experience: 'beginner' });
  for (const r of p.routines) for (const e of r.exercises) assert.equal(EXERCISES.find((x) => x.id === e.exId).equip, 'bodyweight');
});

test('AI output is sanitised: unknown exercises dropped, nonsense numbers clamped', () => {
  const clean = sanitizeAiProgram({ routines: [{ name: 'A', exercises: [{ exId: 'barbell-bench-press', sets: 99, repMin: 5, repMax: 3 }, { exId: 'does-not-exist', sets: 3 }] }] });
  assert.equal(clean.routines[0].exercises.length, 1);
  assert.equal(clean.routines[0].exercises[0].sets, 8);
  assert.ok(clean.routines[0].exercises[0].repMax >= clean.routines[0].exercises[0].repMin);
  assert.equal(sanitizeAiProgram({ routines: [{ exercises: [{ exId: 'nope' }] }] }), null);
  const meal = normalizeMeal({ items: [{ name: 'Mystery', kcal: 50, protein: 30, carbs: 30, fat: 10 }, { name: 'Zero', kcal: 0 }] });
  assert.equal(meal.items.length, 1);
  assert.equal(meal.items[0].kcal, 330, 'implausible kcal replaced by macro-derived value');
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Sure! {"x":[1,2]} hope that helps'), { x: [1, 2] });
  assert.throws(() => extractJson('no json here'));
});

test('food database search and entry maths', () => {
  assert.ok(FOODS.length >= 190);
  const hit = searchFoods('chicken breast')[0];
  assert.match(hit.name, /Chicken breast/);
  const banana = FOODS.find((f) => f.id === 'banana');
  const e = entryFromFood(banana, banana.serv[0], 2, 'snack');
  assert.equal(entryTotals(e).kcal, Math.round(banana.kcal * 1.18) * 2);
});
