import { useState } from 'preact/hooks';
import { Scale, Percent, Ruler, Columns2, Target, Trophy, Plus, ChevronRight, Info, TriangleAlert, Gauge, Dumbbell, Sparkles, Camera, Check } from 'lucide-preact';
import { Card, Btn, Section, Segmented, Row, Badge, Field, NumInput, Sheet, cx, Empty, Progress as Bar, Chip } from '../ui/kit.jsx';
import { Ring, LineChart } from '../ui/charts.jsx';
import { WeightInput, LengthInput } from '../ui/inputs.jsx';
import { openSheet, closeTop, toast } from '../ui/nav.js';
import { useStore, latestWeight, latestBodyFat, latestMeasures, setProfile, getAge, isMinor, logWeight, deleteWeight, computeRecords } from '../lib/store.js';
import { weightPoints, bestLifts } from '../lib/selectors.js';
import { trendSeries, bmi, bmiCategory, checkGoal, maxPotential, leanMassKg, STANDARDS, LEVELS, strengthLevel, epley1RM, cunBae, bmiBodyFat } from '../lib/calc.js';
import { dispWeight, weightUnit, fmtWeight, round, parseDay, daysBetween, today, fmtDay, fmtNum, addDays, dispLen, lenUnit } from '../lib/util.js';
import { getExercise } from '../lib/exercises.js';
import { LogWeightSheet } from './shared.jsx';
import { openBodyFat, openMeasurements, openSymmetry } from './BodyFat.jsx';
import { GalleryView } from './Gallery.jsx';

let lastSeg = 'body';
const RANGES = [{ id: '30', label: '1M', d: 30 }, { id: '90', label: '3M', d: 90 }, { id: '365', label: '1Y', d: 365 }, { id: 'all', label: 'All', d: 0 }];

function BodyTab() {
  const s = useStore();
  const u = s.profile.units;
  const [range, setRange] = useState('90');
  const days = RANGES.find((r) => r.id === range).d;
  const pts = weightPoints(s, days);
  const tr = trendSeries(pts.map((p) => ({ d: p.d, v: p.kg })));
  const conv = (kg) => +dispWeight(kg, u, 1);
  const chartPts = tr.map((p) => ({ x: parseDay(p.d).getTime() / 864e5, y: conv(p.v), t: conv(p.t), d: p.d }));
  const w = latestWeight(s);
  const first = pts[0];
  const change = w && first ? w.kg - first.kg : 0;
  const bf = latestBodyFat(s);
  const b = w ? bmi(w.kg, s.profile.heightCm) : null;
  const age = getAge(s.profile);
  const cat = bmiCategory(b, age);
  const m = latestMeasures(s);
  const goal = s.profile.goalWeightKg;

  return (
    <div class="stack-lg">
      <Card>
        <div class="spread" style="align-items:flex-start">
          <div><div class="muted small bold">WEIGHT</div><div class="big-num num" style="margin-top:4px">{w ? dispWeight(w.kg, u) : '–'}<small>{weightUnit(u)}</small></div>
            {pts.length > 1 && <div class={cx('small', 'bold')} style="margin-top:6px;color:var(--text2)">{change > 0 ? '+' : ''}{round(u === 'imperial' ? change * 2.2046 : change, 1)} {weightUnit(u)} in range</div>}</div>
          <Btn size="sm" icon={Plus} onClick={() => openSheet(LogWeightSheet)}>Log</Btn>
        </div>
        <div style="margin:12px 0 4px"><LineChart points={chartPts} showTrend={chartPts.length > 3} goal={goal ? conv(goal) : undefined} fmt={(v) => round(v, 1)} /></div>
        <Segmented size="sm" value={range} onChange={setRange} options={RANGES.map((r) => ({ id: r.id, label: r.label }))} />
      </Card>

      <div class="grid2">
        <Card onClick={() => openBodyFat()}>
          <div class="muted small bold row-flex gap8"><Percent size={15} />BODY FAT</div>
          <div class="big-num num" style="font-size:32px;margin-top:6px">{bf ? bf.pct : '–'}<small>%</small></div>
          <div class="muted small" style="margin-top:4px">{bf ? `${fmtDay(bf.d)} · ${bf.method === 'tape' ? 'Navy' : bf.method === 'ai' ? 'AI' : bf.method === 'calipers' ? 'Calipers' : 'Estimate'}` : 'Tap to estimate'}</div>
        </Card>
        <Card>
          <div class="muted small bold row-flex gap8"><Gauge size={15} />BMI</div>
          <div class="big-num num" style="font-size:32px;margin-top:6px">{b ? round(b, 1) : '–'}</div>
          <div style="margin-top:6px"><Badge tone={cat.tone}>{cat.label}</Badge></div>
        </Card>
      </div>

      <div class="list">
        <Row icon={Percent} title="Body fat estimator" sub="Tape, calipers, quick formula or AI photo" onClick={openBodyFat} />
        <Row icon={Ruler} title="Measurements" sub={Object.keys(m).length ? `${Object.keys(m).length} sites logged` : 'Log arms, waist, thighs…'} onClick={openMeasurements} />
        <Row icon={Columns2} title="Symmetry check" sub="V-taper, left/right balance, proportions" onClick={openSymmetry} />
      </div>

      {s.weights.length > 0 && (
        <Section title="Weigh-ins">
          <div class="list">{[...s.weights].sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 6).map((x) => (
            <div class="row" key={x.d}><div class="row-main"><div class="row-title">{fmtWeight(x.kg, u)}</div><div class="row-sub">{fmtDay(x.d)}</div></div><button class="link" style="color:var(--text3)" onClick={() => deleteWeight(x.d)}>Delete</button></div>
          ))}</div>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- goal checker
function GoalTab() {
  const s = useStore();
  const p = s.profile, u = p.units;
  const age = getAge(p) ?? 25;
  const minor = isMinor(age);
  const w = latestWeight(s)?.kg ?? 70;
  const loggedBf = latestBodyFat(s);
  const estBf = loggedBf?.pct ?? (minor ? bmiBodyFat({ sex: p.sex, kg: w, cm: p.heightCm, age }) : cunBae({ sex: p.sex, kg: w, cm: p.heightCm, age }));
  const [bf0, setBf0] = useState(null);
  const bf = bf0 ?? round(estBf, 1);
  const [gw, setGw] = useState(p.goalWeightKg ?? null);
  const [gbf, setGbf] = useState(p.goalBfPct ?? null);
  const [wrist, setWrist] = useState(p.wristCm ?? null);
  const [ankle, setAnkle] = useState(p.ankleCm ?? null);
  const lean0 = leanMassKg(w, bf);

  const goalWeight = gw ?? w, goalBf = gbf ?? bf;
  const res = checkGoal({ sex: p.sex, age, heightCm: p.heightCm, weightKg: w, bfPct: bf, wristCm: wrist, ankleCm: ankle, goalWeightKg: goalWeight, goalBfPct: goalBf });
  const preset = (kind) => {
    const leanGain = kind === 'muscle5' ? 5 : kind === 'muscle3' ? 3 : 0;
    const targetBf = kind === 'lean' ? (p.sex === 'female' ? 20 : 12) : kind === 'athletic' ? (p.sex === 'female' ? 24 : 15) : Math.min(bf, p.sex === 'female' ? 24 : 16);
    const lean = lean0 + leanGain;
    setGbf(targetBf); setGw(round(lean / (1 - targetBf / 100), 1));
  };
  const save = () => { setProfile({ goalWeightKg: gw, goalBfPct: gbf, wristCm: wrist, ankleCm: ankle }); toast('Goal saved', 'good'); };
  const tone = res.verdict === 'ok' || res.verdict === 'there' ? 'good' : res.verdict === 'ambitious' ? 'warn' : 'bad';
  const eta = res.etaDate ? new Date(res.etaDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;
  const monthsFmt = (m) => (m === Infinity ? '∞' : m < 1 ? '<1 mo' : m < 24 ? `${round(m, 0)} mo` : `${round(m / 12, 1)} yr`);

  return (
    <div class="stack-lg">
      {minor && <div class="notice warn"><TriangleAlert size={20} /><div>You're still growing, so Forma skips "genetic potential" estimates and uses cautious timelines. Focus on technique, eating enough and sleep.</div></div>}
      <Card>
        <div class="bold" style="font-size:17px;margin-bottom:12px">Set your goal</div>
        <div class="chips" style="margin-bottom:14px">
          <Chip onClick={() => preset('lean')}>Lean ({p.sex === 'female' ? '20' : '12'}%)</Chip>
          <Chip onClick={() => preset('athletic')}>Athletic ({p.sex === 'female' ? '24' : '15'}%)</Chip>
          {!minor && <Chip onClick={() => preset('muscle3')}>+3 kg muscle</Chip>}
          {!minor && <Chip onClick={() => preset('muscle5')}>+5 kg muscle</Chip>}
        </div>
        <div class="grid2">
          <Field label="Current weight" hint="Update in the Body tab"><div class="input" style="display:flex;align-items:center;justify-content:space-between;color:var(--text2)"><span>{dispWeight(w, u)}</span><span class="faint">{weightUnit(u)}</span></div></Field>
          <Field label="Current body fat"><NumInput value={bf} unit="%" onChange={setBf0} /></Field>
          <WeightInput label="Goal weight" kg={gw} units={u} onChange={setGw} />
          <Field label="Goal body fat"><NumInput value={gbf} unit="%" onChange={setGbf} /></Field>
        </div>
        {!minor && (
          <div style="margin-top:12px"><div class="muted small bold" style="margin-bottom:8px">FRAME SIZE (improves accuracy{res.pot.estimatedFrame ? ' – currently estimated' : ''})</div>
            <div class="grid2"><LengthInput label="Wrist" cm={wrist} units={u} onChange={setWrist} placeholder="17" /><LengthInput label="Ankle" cm={ankle} units={u} onChange={setAnkle} placeholder="22" /></div></div>
        )}
        <Btn block variant="secondary" style="margin-top:14px" icon={Check} onClick={save}>Save goal</Btn>
      </Card>

      <div class="hero">
        <div class="spread"><Badge tone={tone}>{res.verdictLabel}</Badge>{eta && res.verdict !== 'there' && <span class="muted small bold">ETA ≈ {eta}</span>}</div>
        <div class="grid2" style="margin-top:16px">
          <div><div class="big-num num" style="font-size:34px">{res.verdict === 'there' ? '✓' : monthsFmt(res.monthsTotal)}</div><div class="muted small">estimated total time</div></div>
          <div><div class="big-num num" style="font-size:34px">{res.dLean >= 0 ? '+' : ''}{dispWeight(res.dLean, u, 1)}<small>{weightUnit(u)}</small></div><div class="muted small">lean mass change</div></div>
        </div>
        <div class="stack-sm" style="margin-top:16px">
          {res.monthsMuscle > 0 && <div class="spread small"><span class="muted">Build muscle phase</span><b>{monthsFmt(res.monthsMuscle)}</b></div>}
          {res.monthsFat > 0 && <div class="spread small"><span class="muted">Fat loss phase</span><b>{monthsFmt(res.monthsFat)}</b></div>}
          <div class="spread small"><span class="muted">Fat mass change</span><b>{res.dFat >= 0 ? '+' : ''}{dispWeight(res.dFat, u, 1)} {weightUnit(u)}</b></div>
        </div>
      </div>

      {!minor && (
        <Card>
          <div class="row-flex" style="gap:18px">
            <Ring value={Math.min(1, res.pctPotential)} max={1} size={110} stroke={11}><div class="big num" style="font-size:26px">{Math.round(res.pctPotential * 100)}%</div></Ring>
            <div class="grow"><div class="bold">of your natural muscle potential</div>
              <div class="muted small" style="margin-top:4px">Est. ceiling ≈ {dispWeight(res.pot.maxLeanKg, u, 0)} {weightUnit(u)} lean mass (≈ {dispWeight(res.pot.maxWeightKg, u, 0)} {weightUnit(u)} at 10% body fat).</div>
              {res.monthlyGainNow != null && <div class="small" style="margin-top:6px"><b>~{dispWeight(res.monthlyGainNow, u, 2)} {weightUnit(u)}</b> of muscle / month is realistic right now.</div>}</div>
          </div>
        </Card>
      )}
      {res.notes.map((n, i) => <div class="notice" key={i}><Info size={20} /><div>{n}</div></div>)}
      <div class="muted tiny center" style="padding:0 10px">Potential uses a Casey Butt–style frame model and a "remaining potential halves each year" progress curve. Genetics, training, sleep and nutrition vary – treat it as a map, not a promise.</div>
    </div>
  );
}

// ---------------------------------------------------------------- lifts
function ManualLiftSheet({ lift }) {
  const s = useStore();
  const u = s.profile.units;
  const [w, setW] = useState(null);
  const [r, setR] = useState(5);
  const e = w && r ? epley1RM(w, r) : null;
  return (
    <Sheet title={`${STANDARDS[lift].label} – your best`} footer={<Btn block size="lg" disabled={!e} onClick={() => { setProfile({ lifts: { ...(s.profile.lifts || {}), [lift]: round(e, 1) } }); toast('Saved', 'good'); closeTop(); }}>Save</Btn>}>
      <div class="stack">
        <WeightInput label="Weight lifted" kg={w} units={u} onChange={setW} autofocus />
        <Field label="Reps"><NumInput value={r} decimals={0} onChange={setR} placeholder="5" /></Field>
        {e && <div class="center"><div class="muted small">Estimated 1-rep max</div><div class="big-num num">{dispWeight(e, u, 0)}<small>{weightUnit(u)}</small></div></div>}
      </div>
    </Sheet>
  );
}

function LiftsTab() {
  const s = useStore();
  const u = s.profile.units;
  const bw = latestWeight(s)?.kg;
  const best = bestLifts(s, epley1RM);
  const manual = s.profile.lifts || {};
  const rec = computeRecords(s.history);
  const top = Object.entries(rec).filter(([id, r]) => r.e1rm > 0).sort((a, b) => b[1].e1rm - a[1].e1rm).slice(0, 8);
  return (
    <div class="stack-lg">
      <Section title="Strength levels" sub="Compared with bodyweight standards for your sex">
        <div class="stack-sm">
          {Object.keys(STANDARDS).map((lift) => {
            const e1 = Math.max(best[lift]?.e1rm || 0, manual[lift] || 0);
            const lv = e1 ? strengthLevel(lift, s.profile.sex, bw, e1) : null;
            return (
              <Card key={lift} onClick={() => openSheet(ManualLiftSheet, { lift })}>
                <div class="spread"><div class="bold">{STANDARDS[lift].label}</div>{lv ? <Badge tone={lv.idx >= 3 ? 'good' : lv.idx >= 1 ? 'accent' : 'muted'}>{lv.level}</Badge> : <span class="muted small">Tap to add</span>}</div>
                {lv ? (<>
                  <div class="spread small" style="margin:8px 0 6px"><span class="muted">Est. 1RM <b style="color:var(--text)">{dispWeight(e1, u, 0)} {weightUnit(u)}</b> · {round(lv.ratio, 2)}× bodyweight</span>{lv.nextLevel && <span class="muted">{lv.nextLevel}: {dispWeight(lv.nextKg, u, 0)}</span>}</div>
                  <Bar value={lv.progress} max={1} height={8} />
                </>) : <div class="muted small" style="margin-top:6px">Log it in a workout, or enter a recent heavy set.</div>}
              </Card>
            );
          })}
        </div>
      </Section>
      <Section title="Personal records">
        {!top.length ? <Card class="flat"><div class="muted center small" style="padding:10px">Records appear as you log workouts.</div></Card> : (
          <div class="list">{top.map(([id, r]) => <div class="row" key={id}><div class="row-icon" style="color:#ffd34d"><Trophy size={19} /></div><div class="row-main"><div class="row-title">{getExercise(id).name}</div><div class="row-sub">Heaviest {dispWeight(r.weight, u)} {weightUnit(u)} · Best set {dispWeight(r.volume / 1, u, 0)}</div></div><div class="bold num">{dispWeight(r.e1rm, u, 0)}<span class="muted small"> 1RM</span></div></div>)}</div>
        )}
      </Section>
    </div>
  );
}

export function Progress() {
  const [seg, setSegState] = useState(lastSeg);
  const setSeg = (v) => { lastSeg = v; setSegState(v); };
  return (
    <>
      <div class="screen-head"><div><div class="sub">Body & strength</div><h1>Progress</h1></div></div>
      <Segmented value={seg} onChange={setSeg} options={[{ id: 'body', label: 'Body' }, { id: 'photos', label: 'Photos' }, { id: 'goals', label: 'Goals' }, { id: 'lifts', label: 'Lifts' }]} class="" />
      <div style="margin-top:18px">
        {seg === 'body' && <BodyTab />}
        {seg === 'photos' && <GalleryView />}
        {seg === 'goals' && <GoalTab />}
        {seg === 'lifts' && <LiftsTab />}
      </div>
    </>
  );
}
