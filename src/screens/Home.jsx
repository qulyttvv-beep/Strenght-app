import { Flame, Dumbbell, Camera, Scale, Sparkles, Play, Trophy, Droplets, ChevronRight, Utensils, Bot, Zap, Info } from 'lucide-preact';
import { Card, Btn, Section, Progress as Bar, cx, Badge } from '../ui/kit.jsx';
import { Ring, Sparkline } from '../ui/charts.jsx';
import { openPage, openSheet, setTab, toast } from '../ui/nav.js';
import { useStore, currentTargets, latestWeight, nextRoutine, startWorkout, getAge, addWater } from '../lib/store.js';
import { dayTotals, streak, activeDates, workoutDates, weekWorkouts, weightPoints, intakeByDay } from '../lib/selectors.js';
import { today, greeting, fmtDay, weekStart, addDays, dowLetter, fmtWeight, fmtNum, round, dispWeight, weightUnit, fmtDurationShort } from '../lib/util.js';
import { getExercise } from '../lib/exercises.js';
import { estimateMinutes } from '../lib/generator.js';
import { adaptiveTdee, trendSeries } from '../lib/calc.js';
import { WorkoutPage } from './Workout.jsx';
import { openAddFood } from './AddFood.jsx';
import { LogWeightSheet, CoachSheet } from './shared.jsx';
import { openAddPhoto } from './Gallery.jsx';

export function Home() {
  const s = useStore();
  const t = currentTargets(s);
  const d = today();
  const tot = dayTotals(s, d);
  const left = t.kcal - tot.kcal;
  const routine = nextRoutine(s);
  const wk = weekStart();
  const days = Array.from({ length: 7 }, (_, i) => addDays(wk, i));
  const act = activeDates(s), wod = workoutDates(s);
  const wkCount = weekWorkouts(s).length;
  const sk = streak(s);
  const w = latestWeight(s);
  const wpts = weightPoints(s, 30);
  const first = wpts[0], delta = w && first && wpts.length > 1 ? w.kg - first.kg : null;
  const water = s.food.water[d] || 0;
  const u = s.profile.units;
  const age = getAge(s.profile);
  const tdee = adaptiveTdee({ weights: weightPoints(s), intakeByDay: intakeByDay(s), today: d });

  const startRoutine = () => { if (s.active) { openPage(WorkoutPage); return; } if (routine) { startWorkout({ routine }); openPage(WorkoutPage); } else setTab('train'); };

  return (
    <>
      <div class="screen-head">
        <div>
          <div class="sub">{fmtDay(d)} · {greeting()}</div>
          <h1>{s.profile.name ? `Hey, ${s.profile.name}` : 'Today'}</h1>
        </div>
        <button class="iconbtn fab-ai" style="width:46px;height:46px;border-radius:16px" aria-label="AI coach" onClick={() => openSheet(CoachSheet)}><Sparkles size={22} /></button>
      </div>

      <div class="hero">
        <div class="row-flex" style="gap:18px;align-items:center">
          <Ring value={tot.kcal} max={t.kcal} size={142} stroke={14}>
            <div class="big num">{Math.abs(left).toLocaleString()}</div>
            <div class="lbl">{left >= 0 ? 'kcal left' : 'kcal over'}</div>
          </Ring>
          <div class="grow stack-sm">
            <div class="macro"><div class="top"><span>Protein</span><b>{tot.p} / {t.protein}g</b></div><Bar value={tot.p} max={t.protein} color="var(--p)" height={7} /></div>
            <div class="macro"><div class="top"><span>Carbs</span><b>{tot.c} / {t.carbs}g</b></div><Bar value={tot.c} max={t.carbs} color="var(--c)" height={7} /></div>
            <div class="macro"><div class="top"><span>Fat</span><b>{tot.f} / {t.fat}g</b></div><Bar value={tot.f} max={t.fat} color="var(--f)" height={7} /></div>
          </div>
        </div>
        <div class="spread" style="margin-top:16px">
          <div class="muted small"><b style="color:var(--text)" class="num">{tot.kcal.toLocaleString()}</b> eaten · goal {t.kcal.toLocaleString()}</div>
          <Btn size="sm" icon={Sparkles} onClick={() => openAddFood({ date: d, tab: 'ai' })}>Log meal</Btn>
        </div>
      </div>

      <Section title="Today's workout" action={routine ? 'All workouts' : undefined} onAction={() => setTab('train')}>
        {s.active ? (
          <Card class="accent-card" onClick={() => openPage(WorkoutPage)}>
            <div class="spread"><div><div class="bold" style="font-size:18px">{s.active.name}</div><div class="muted small">Workout in progress – tap to resume</div></div><Play size={28} fill="currentColor" /></div>
          </Card>
        ) : routine ? (
          <Card class="rt-card">
            <div class="spread"><h3>{routine.name}</h3><Badge tone="accent">~{estimateMinutes(routine)} min</Badge></div>
            <div class="ex-line">{routine.exercises.slice(0, 5).map((e) => getExercise(e.exId).name).join(' · ')}{routine.exercises.length > 5 ? ` +${routine.exercises.length - 5}` : ''}</div>
            <Btn block icon={Play} class="" style="margin-top:14px" onClick={startRoutine}>Start workout</Btn>
          </Card>
        ) : (
          <Card><div class="spread"><div><div class="bold">No program yet</div><div class="muted small">Build one in seconds – offline or with AI</div></div><Btn size="sm" onClick={() => setTab('train')}>Create</Btn></div></Card>
        )}
      </Section>

      <div class="grid3" style="margin-top:16px">
        <button class="quick" onClick={() => openSheet(LogWeightSheet)}><span class="qi"><Scale size={22} /></span>Weigh in</button>
        <button class="quick" onClick={() => openAddPhoto()}><span class="qi"><Camera size={22} /></span>Progress pic</button>
        <button class="quick" onClick={() => { addWater(d, 250); toast('+250 ml water 💧', 'good'); }}><span class="qi"><Droplets size={22} /></span>+250 ml</button>
      </div>

      <Section title="This week">
        <Card>
          <div class="week-dots">
            {days.map((dd) => (
              <div key={dd} class={cx('wd', act.has(dd) && 'done', dd === d && 'today')}><i>{wod.has(dd) ? <Dumbbell size={15} strokeWidth={2.6} /> : act.has(dd) ? <Utensils size={14} strokeWidth={2.6} /> : null}</i>{dowLetter(dd)}</div>
            ))}
          </div>
          <div class="grid3" style="margin-top:16px">
            <div><div class="big-num" style="font-size:28px">{wkCount}</div><div class="muted small">workouts</div></div>
            <div><div class="big-num" style="font-size:28px">{sk}</div><div class="muted small">day streak 🔥</div></div>
            <div><div class="big-num" style="font-size:28px">{round(water / 1000, 1)}<small>L</small></div><div class="muted small">water today</div></div>
          </div>
        </Card>
      </Section>

      <Section title="Body weight" action="Details" onAction={() => setTab('progress')}>
        <Card onClick={() => openSheet(LogWeightSheet)}>
          <div class="spread">
            <div>
              <div class="big-num num">{w ? dispWeight(w.kg, u) : '–'}<small>{weightUnit(u)}</small></div>
              <div class={cx('small', delta == null ? 'muted' : delta < 0 === (s.profile.goal === 'lose') ? 'good' : 'muted')} style="margin-top:6px;font-weight:700">
                {delta == null ? 'Log a few weigh-ins to see your trend' : `${delta > 0 ? '+' : ''}${round(u === 'imperial' ? delta * 2.2046 : delta, 1)} ${weightUnit(u)} in 30 days`}
              </div>
            </div>
            <Sparkline values={trendSeries(wpts.map((x) => ({ d: x.d, v: x.kg }))).map((x) => x.t)} width={110} height={46} />
          </div>
        </Card>
      </Section>

      {tdee && (
        <Section title="Smart insight">
          <Card><div class="row-flex" style="align-items:flex-start;gap:12px"><div class="row-icon"><Zap size={19} /></div><div class="grow"><div class="bold">Your real maintenance: ~{fmtNum(tdee.tdee)} kcal</div><div class="muted small" style="margin-top:3px">From {tdee.days} logged days: you ate ~{fmtNum(tdee.intake)} kcal/day and your weight changed {tdee.kgPerWeek > 0 ? '+' : ''}{round(u === 'imperial' ? tdee.kgPerWeek * 2.2046 : tdee.kgPerWeek, 2)} {weightUnit(u)}/week. Target: {fmtNum(t.kcal)} kcal.</div></div></div></Card>
        </Section>
      )}

      {age != null && age < 18 && (
        <div class="notice" style="margin-top:18px"><Info size={20} /><div>Teen mode: gentler calorie targets, no physique-photo AI. Fuel your training and sleep 8–10 hours.</div></div>
      )}
    </>
  );
}
