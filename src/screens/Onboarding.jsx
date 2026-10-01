import { useState } from 'preact/hooks';
import { ChevronLeft, ShieldCheck, Info, TriangleAlert, Lock, Sparkles, WifiOff, Dumbbell } from 'lucide-preact';
import { Btn, Segmented, Field, NumInput, Progress, cx } from '../ui/kit.jsx';
import { WeightInput, HeightInput } from '../ui/inputs.jsx';
import { completeOnboarding } from '../lib/store.js';
import { ACTIVITY, GOALS, PACE_OPTIONS, defaultPace, ageFromBirthdate, computeTargets, isMinor, MIN_AGE } from '../lib/calc.js';
import { EXPERIENCE, EQUIP_PRESETS } from '../lib/generator.js';
import { dispWeight, weightUnit, parseWeight, round } from '../lib/util.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEAR = new Date().getFullYear();
const STEPS = 7;

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    birth: { day: '', month: '', year: '' }, sex: 'male', units: 'metric', heightCm: 175, weightKg: 75, goal: 'maintain', goalWeightKg: null, rate: 0.5,
    experience: 'beginner', days: 3, minutes: 60, equip: 'gym', activity: 'moderate', name: '',
  });
  const set = (p) => setD((x) => ({ ...x, ...p }));
  const iso = d.birth.day && d.birth.month !== '' && d.birth.year ? `${d.birth.year}-${String(+d.birth.month + 1).padStart(2, '0')}-${String(d.birth.day).padStart(2, '0')}` : null;
  const validDate = iso && !Number.isNaN(Date.parse(iso)) && new Date(+d.birth.year, +d.birth.month, +d.birth.day).getMonth() === +d.birth.month;
  const age = validDate ? ageFromBirthdate(iso) : null;
  const minor = isMinor(age);
  const tooYoung = age != null && age < MIN_AGE;
  const impossible = age != null && (age > 100 || age < 0);

  const targets = computeTargets({ sex: d.sex, kg: d.weightKg || 70, cm: d.heightCm || 170, age: age ?? 25, activity: d.activity, goal: d.goal, rateKgPerWeek: d.rate });
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    const eq = EQUIP_PRESETS.find((e) => e.id === d.equip)?.equip;
    completeOnboarding({
      weightKg: d.weightKg,
      profile: {
        name: d.name.trim(), sex: d.sex, birthdate: iso, heightCm: d.heightCm, units: d.units, activity: d.activity, goal: d.goal,
        goalWeightKg: d.goal === 'lose' || d.goal === 'gain' ? d.goalWeightKg : null, rateKgPerWeek: d.rate, experience: d.experience, daysPerWeek: d.days, minutes: d.minutes, equipment: eq,
      },
    });
  };

  const canNext = [
    true,
    validDate && !impossible && !tooYoung,
    !!d.heightCm && d.heightCm > 100 && d.heightCm < 250 && !!d.weightKg && d.weightKg > 25 && d.weightKg < 350,
    true, true, true, true,
  ][step];

  return (
    <div class="onb">
      {step > 0 && (
        <div class="onb-top">
          <button class="iconbtn" onClick={back} aria-label="Back"><ChevronLeft size={26} /></button>
          <Progress value={step} max={STEPS - 1} height={6} />
          <span class="faint small num" style="width:34px;text-align:right">{step}/{STEPS - 1}</span>
        </div>
      )}
      <div class="onb-body" key={step}>
        {step === 0 && (
          <div class="center" style="padding-top:8vh">
            <img class="logo-mark" src="./icon-192.png" alt="" />
            <h1 style="margin-top:26px;font-size:40px">Forma</h1>
            <p class="lead" style="margin-top:10px">Track lifts, calories and your physique.<br />Free, private and built to last.</p>
            <div class="stack-sm" style="text-align:left;margin-top:34px">
              <div class="notice"><Lock size={20} /><div><b style="color:var(--text)">Your data stays on your phone.</b> No account, no cloud. AI features only call a free AI service when you tap them.</div></div>
              <div class="notice"><WifiOff size={20} /><div>Workouts, food database and body tools work fully offline.</div></div>
              <div class="notice"><ShieldCheck size={20} /><div>For ages {MIN_AGE} and up. Not medical advice.</div></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <h1>When were you born?</h1>
            <p class="lead">Forma is for people aged {MIN_AGE} and over. Your age also makes calorie and body-fat maths more accurate.</p>
            <div class="dob">
              <Field label="Day"><select class="input" value={d.birth.day} onChange={(e) => set({ birth: { ...d.birth, day: e.currentTarget.value } })}><option value="">Day</option>{Array.from({ length: 31 }, (_, i) => <option value={i + 1}>{i + 1}</option>)}</select></Field>
              <Field label="Month"><select class="input" value={d.birth.month} onChange={(e) => set({ birth: { ...d.birth, month: e.currentTarget.value } })}><option value="">Month</option>{MONTHS.map((m, i) => <option value={i}>{m.slice(0, 3)}</option>)}</select></Field>
              <Field label="Year"><select class="input" value={d.birth.year} onChange={(e) => set({ birth: { ...d.birth, year: e.currentTarget.value } })}><option value="">Year</option>{Array.from({ length: 95 }, (_, i) => YEAR - i).map((y) => <option value={y}>{y}</option>)}</select></Field>
            </div>
            <div class="stack-sm" style="margin-top:20px">
              {tooYoung && <div class="notice bad"><TriangleAlert size={20} /><div><b style="color:var(--text)">Sorry – Forma is for ages {MIN_AGE}+.</b><br />Come back when you turn {MIN_AGE}. Until then, staying active, sleeping well and eating a variety of foods is the best plan. If you have questions about health or growth, ask a parent or doctor.</div></div>}
              {impossible && <div class="notice bad"><TriangleAlert size={20} /><div>That date doesn't look right. Please check it.</div></div>}
              {minor && !tooYoung && <div class="notice warn"><Info size={20} /><div><b style="color:var(--text)">Teen mode is on.</b> You're still growing, so Forma uses gentler calorie targets, never pushes aggressive fat loss, and turns off physique-photo AI. Talk to a parent or doctor before changing your diet.</div></div>}
              {age != null && age >= 18 && age <= 100 && <div class="notice"><ShieldCheck size={20} /><div>Thanks – you're {age}. Your date of birth is stored only on this device.</div></div>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>About you</h1>
            <p class="lead">Used for calorie targets and body-fat estimates.</p>
            <div class="stack">
              <Field label="Name (optional)"><input class="input" placeholder="What should we call you?" value={d.name} onInput={(e) => set({ name: e.currentTarget.value.slice(0, 24) })} /></Field>
              <Field label="Sex (for calorie & body-fat formulas)"><Segmented options={[{ id: 'male', label: 'Male' }, { id: 'female', label: 'Female' }]} value={d.sex} onChange={(v) => set({ sex: v })} /></Field>
              <Field label="Units"><Segmented options={[{ id: 'metric', label: 'kg · cm' }, { id: 'imperial', label: 'lb · ft/in' }]} value={d.units} onChange={(v) => set({ units: v })} /></Field>
              <HeightInput cm={d.heightCm} units={d.units} onChange={(v) => set({ heightCm: v })} />
              <WeightInput label="Current weight" kg={d.weightKg} units={d.units} onChange={(v) => set({ weightKg: v })} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>What's your goal?</h1>
            <p class="lead">You can change this any time.</p>
            {GOALS.map((g) => (
              <button key={g.id} class={cx('opt', d.goal === g.id && 'on')} onClick={() => set({ goal: g.id, rate: defaultPace(g.id) })}>
                <span class="em">{g.emoji}</span><span><b>{g.label}</b><span class="s">{g.hint}</span></span>
              </button>
            ))}
            {(d.goal === 'lose' || d.goal === 'gain') && (
              <div class="stack" style="margin-top:18px">
                <WeightInput label={`Goal weight (optional)`} kg={d.goalWeightKg} units={d.units} onChange={(v) => set({ goalWeightKg: v })} hint="We'll check how realistic it is in Progress → Goal checker." />
                {!minor && (
                  <Field label="Pace">
                    <Segmented value={String(d.rate)} onChange={(v) => set({ rate: +v })} options={(PACE_OPTIONS[d.goal] || PACE_OPTIONS.lose).map((r) => ({ id: String(r), label: `${round(d.units === 'imperial' ? r * 2.2046 : r, 2)} ${weightUnit(d.units)}/wk` }))} />
                  </Field>
                )}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h1>Your training</h1>
            <p class="lead">We'll build a starter program from this. You can regenerate or let AI design one later.</p>
            <div class="stack">
              <Field label="Experience"><Segmented options={EXPERIENCE.map((e) => ({ id: e.id, label: e.label }))} value={d.experience} onChange={(v) => set({ experience: v })} /></Field>
              <Field label="Days per week"><Segmented options={[2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: String(n) }))} value={String(d.days)} onChange={(v) => set({ days: +v })} /></Field>
              <Field label="Session length"><Segmented options={[30, 45, 60, 75].map((n) => ({ id: String(n), label: `${n} min` }))} value={String(d.minutes)} onChange={(v) => set({ minutes: +v })} /></Field>
              <Field label="Equipment">
                {EQUIP_PRESETS.map((e) => <button class={cx('opt', d.equip === e.id && 'on')} style="padding:13px 16px;margin-bottom:8px" onClick={() => set({ equip: e.id })}><span class="em" style="width:38px;height:38px;font-size:20px"><Dumbbell size={20} /></span><b style="font-size:15.5px">{e.label}</b></button>)}
              </Field>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1>How active are you?</h1>
            <p class="lead">Outside of planned workouts – think work and daily life.</p>
            {ACTIVITY.map((a) => (
              <button key={a.id} class={cx('opt', d.activity === a.id && 'on')} onClick={() => set({ activity: a.id })}>
                <span><b>{a.label}</b><span class="s">{a.hint}</span></span>
              </button>
            ))}
          </>
        )}

        {step === 6 && (
          <>
            <h1>Your daily plan</h1>
            <p class="lead">Based on {dispWeight(d.weightKg, d.units)} {weightUnit(d.units)}, your goal and activity. Adjust anytime in Settings.</p>
            <div class="hero center">
              <div class="muted small bold">DAILY CALORIES</div>
              <div style="font-size:56px;font-weight:800;letter-spacing:-2px;line-height:1.1;margin:6px 0">{targets.kcal.toLocaleString()}</div>
              <div class="muted small">Maintenance ≈ {targets.maintenance.toLocaleString()} kcal · {targets.delta === 0 ? 'no change' : `${targets.delta > 0 ? '+' : ''}${targets.delta} kcal`}</div>
              <div class="grid3" style="margin-top:20px">
                <div class="stat"><div class="v" style="color:var(--p)">{targets.protein}g</div><div class="l">Protein</div></div>
                <div class="stat"><div class="v" style="color:var(--c)">{targets.carbs}g</div><div class="l">Carbs</div></div>
                <div class="stat"><div class="v" style="color:var(--f)">{targets.fat}g</div><div class="l">Fat</div></div>
              </div>
            </div>
            <div class="stack-sm" style="margin-top:16px">
              {targets.notes.map((n) => <div class="notice warn"><Info size={20} /><div>{n}</div></div>)}
              <div class="notice"><Sparkles size={20} /><div>Tip: add a free Gemini key in Settings → AI to unlock meal-photo calorie tracking and AI workout planning.</div></div>
              <div class="notice"><Info size={20} /><div>Estimates only – not medical advice. See a doctor before big diet or training changes.</div></div>
            </div>
          </>
        )}
      </div>
      <div class="onb-foot">
        {step < STEPS - 1
          ? <Btn block size="lg" disabled={!canNext} onClick={step === 0 ? next : next}>{step === 0 ? 'Get started' : 'Continue'}</Btn>
          : <Btn block size="lg" onClick={finish}>Start training</Btn>}
      </div>
    </div>
  );
}
