import { useState, useRef } from 'preact/hooks';
import { Camera, Image as ImageIcon, Sparkles, Check, Info, Ruler, TriangleAlert, ShieldCheck, Wand2, Target, X } from 'lucide-preact';
import { Page, Sheet, Btn, Segmented, Field, NumInput, Card, Chip, Badge, cx, Progress as Bar } from '../ui/kit.jsx';
import { ScaleBar, Ring } from '../ui/charts.jsx';
import { WeightInput, LengthInput } from '../ui/inputs.jsx';
import { openPage, openSheet, closeTop, toast, confirmDialog } from '../ui/nav.js';
import { useStore, latestWeight, latestBodyFat, latestMeasures, logBodyFat, logMeasures, getAge, isMinor, setAi, setProfile } from '../lib/store.js';
import { navyBodyFat, bmiBodyFat, cunBae, skinfoldBodyFat, SKINFOLD_SITES, bfCategory, bfScale, leanMassKg, fatMassKg, ffmi, bmi, bmiCategory, symmetryReport } from '../lib/calc.js';
import { analyzePhysique, resolveProvider } from '../lib/ai.js';
import { fileToAiDataUrl } from '../lib/image.js';
import { fmtWeight, dispWeight, weightUnit, round, lenUnit } from '../lib/util.js';
import { openProgramBuilder } from './Programs.jsx';
import { MUSCLES } from '../lib/exercises.js';

export const openBodyFat = () => openPage(BodyFatPage);
export const openMeasurements = () => openPage(MeasurementsPage);
export const openSymmetry = () => openPage(SymmetryPage);

const SEG_COLORS = ['#62adff', '#34e3b0', '#a3e635', '#ffb84d', '#ff6b6b'];

// ---------------------------------------------------------------- estimator
function BodyFatPage() {
  const s = useStore();
  const p = s.profile, u = p.units;
  const age = getAge(p) ?? 25;
  const minor = isMinor(age);
  const w = latestWeight(s)?.kg ?? 70;
  const m = latestMeasures(s);
  const [method, setMethod] = useState('quick');
  const [kg, setKg] = useState(w);
  const [neck, setNeck] = useState(m.neck ?? null);
  const [waist, setWaist] = useState(m.waist ?? null);
  const [hips, setHips] = useState(m.hips ?? null);
  const [sf, setSf] = useState([null, null, null]);
  const [aiRes, setAiRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const cam = useRef(), gal = useRef();
  const cfg = resolveProvider(s.settings.ai);

  let pct = null, label = '', note = '';
  if (method === 'quick') { pct = minor ? bmiBodyFat({ sex: p.sex, kg, cm: p.heightCm, age }) : cunBae({ sex: p.sex, kg, cm: p.heightCm, age }); label = minor ? 'BMI-based (teen formula)' : 'CUN-BAE (age, sex, BMI)'; note = 'No tape needed, but it can\'t see muscle – very muscular people read high. Typical error ±5%.'; }
  if (method === 'tape') { pct = navyBodyFat({ sex: p.sex, cm: p.heightCm, neckCm: neck, waistCm: waist, hipCm: hips }); label = 'U.S. Navy circumference method'; note = 'Measure neck below the larynx, waist at the navel (relaxed), hips at the widest point. Typical error ±3–4%.'; }
  if (method === 'calipers') { pct = skinfoldBodyFat({ sex: p.sex, age, a: sf[0], b: sf[1], c: sf[2] }); label = 'Jackson–Pollock 3-site skinfold'; note = 'Pinch each site on the right side, take the reading after 2 seconds. Average of 2–3 tries. Typical error ±3%.'; }
  if (method === 'ai') { pct = aiRes?.mid ?? null; label = `AI visual estimate${aiRes ? ` (${aiRes.provider})` : ''}`; note = 'A vision AI looks at your photo. It is the least precise method (±5%) – use it as a sanity check, not a measurement.'; }

  const sex = p.sex === 'female' ? 'female' : 'male';
  const cat = pct != null && !minor ? bfCategory(sex, pct) : null;
  const scale = bfScale(sex);
  const lean = pct != null ? leanMassKg(kg, pct) : null;
  const fat = pct != null ? fatMassKg(kg, pct) : null;
  const ff = pct != null && !minor ? ffmi(kg, pct, p.heightCm) : null;

  const pick = (e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!f) return; setPhoto(f); setAiRes(null); setPreview((o) => { if (o) URL.revokeObjectURL(o); return URL.createObjectURL(f); }); };
  const runAi = async () => {
    if (!photo) return;
    if (!s.settings.ai.photoConsent) {
      const ok = await confirmDialog({ title: 'Send photo to AI?', message: `Your photo will be sent to ${cfg.name} for this one analysis. Use a plain photo you're comfortable sharing (e.g. fitted clothes). Your gallery is never uploaded.`, confirmLabel: 'Send photo' });
      if (!ok) return;
      setAi({ photoConsent: true });
    }
    setBusy(true); setErr(null);
    try { setAiRes(await analyzePhysique(s.settings.ai, { image: await fileToAiDataUrl(photo, 1024), sex: p.sex, age, heightCm: Math.round(p.heightCm), weightKg: round(kg, 1) })); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const save = () => {
    if (pct == null) return;
    if (method === 'tape') logMeasures({ neck, waist, hips });
    logBodyFat(pct, method); toast(`Saved ${round(pct, 1)}% body fat`, 'good'); closeTop();
  };
  const METHODS = [{ id: 'quick', label: 'Quick' }, { id: 'tape', label: 'Tape' }, { id: 'calipers', label: 'Calipers' }, ...(!minor ? [{ id: 'ai', label: 'AI photo' }] : [])];

  return (
    <Page title="Body fat estimator" footer={<Btn block size="lg" disabled={pct == null} icon={Check} onClick={save}>{pct != null ? `Save ${round(pct, 1)}%` : 'Save'}</Btn>}>
      <div class="stack">
        <Segmented value={method} onChange={setMethod} options={METHODS} />
        {minor && <div class="notice warn"><TriangleAlert size={20} /><div>Body-fat formulas aren't designed for teens who are still growing, so treat any number as a rough guide only. Photo AI is turned off for under-18s.</div></div>}

        {method === 'quick' && <WeightInput label="Weight" kg={kg} units={u} onChange={(v) => setKg(v || w)} />}
        {method === 'tape' && (
          <div class="stack">
            <WeightInput label="Weight (for lean/fat mass)" kg={kg} units={u} onChange={(v) => setKg(v || w)} />
            <div class={p.sex === 'female' ? 'grid3' : 'grid2'}>
              <LengthInput label="Neck" cm={neck} units={u} onChange={setNeck} />
              <LengthInput label="Waist" cm={waist} units={u} onChange={setWaist} />
              {p.sex === 'female' && <LengthInput label="Hips" cm={hips} units={u} onChange={setHips} />}
            </div>
          </div>
        )}
        {method === 'calipers' && (
          <div class="stack">
            <WeightInput label="Weight (for lean/fat mass)" kg={kg} units={u} onChange={(v) => setKg(v || w)} />
            <div class="grid3">{SKINFOLD_SITES[sex].map((site, i) => <Field key={site} label={`${site}`}><NumInput value={sf[i]} unit="mm" onChange={(v) => setSf((x) => x.map((y, j) => (j === i ? v : y)))} /></Field>)}</div>
          </div>
        )}
        {method === 'ai' && (
          <div class="stack">
            {preview
              ? <div class="photo-drop" style="border-style:solid;background:#000"><img src={preview} style="max-height:320px;width:100%;object-fit:contain" alt="" /><button class="iconbtn" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6)" onClick={() => { setPhoto(null); setPreview(null); setAiRes(null); }}><X size={20} /></button></div>
              : <div class="grid2"><Btn variant="secondary" icon={Camera} onClick={() => cam.current.click()}>Take photo</Btn><Btn variant="secondary" icon={ImageIcon} onClick={() => gal.current.click()}>Gallery</Btn></div>}
            <input ref={cam} type="file" accept="image/*" capture="user" hidden onChange={pick} />
            <input ref={gal} type="file" accept="image/*" hidden onChange={pick} />
            <Btn block icon={Sparkles} loading={busy} disabled={!photo} onClick={runAi}>{busy ? 'Analyzing…' : 'Analyze physique'}</Btn>
            {err && <div class="notice bad"><TriangleAlert size={20} /><div>{err}</div></div>}
          </div>
        )}

        {pct != null && (
          <div class="hero">
            <div class="muted small bold">{label.toUpperCase()}</div>
            <div class="big-num num" style="font-size:56px;margin-top:6px">{method === 'ai' && aiRes?.min != null ? `${round(aiRes.min)}–${round(aiRes.max)}` : round(pct, 1)}<small>%</small></div>
            {cat && <div class="row-flex" style="margin-top:8px"><Badge tone={cat.idx <= 2 ? 'good' : cat.idx === 3 ? 'warn' : 'bad'}>{cat.label}</Badge><span class="muted small">for {sex === 'male' ? 'men' : 'women'}</span></div>}
            {cat && <div style="margin-top:16px"><ScaleBar segments={scale.map((r, i) => ({ color: SEG_COLORS[i], weight: i === 0 ? 0.7 : i === scale.length - 1 ? 1.4 : 1 }))} value={Math.min(pct, scale[scale.length - 1][0] + 10)} min={scale[0][0] - 2} max={scale[scale.length - 1][0] + 10} />
              <div class="spread tiny faint" style="margin-top:6px">{scale.map((r) => <span key={r[2]}>{r[2]}</span>)}</div></div>}
            <div class="grid3" style="margin-top:18px">
              <div class="stat"><div class="v num">{dispWeight(lean, u, 1)}</div><div class="l">Lean mass ({weightUnit(u)})</div></div>
              <div class="stat"><div class="v num">{dispWeight(fat, u, 1)}</div><div class="l">Fat mass ({weightUnit(u)})</div></div>
              {ff ? <div class="stat"><div class="v num">{round(ff.normalized, 1)}</div><div class="l">FFMI</div></div> : <div class="stat"><div class="v num">{round(bmi(kg, p.heightCm), 1)}</div><div class="l">BMI</div></div>}
            </div>
          </div>
        )}
        {method === 'ai' && aiRes && (
          <Card><div class="stack-sm">
            <div class="row-flex"><Badge tone={aiRes.confidence === 'high' ? 'good' : aiRes.confidence === 'medium' ? 'warn' : 'bad'}>{aiRes.confidence} confidence</Badge></div>
            {aiRes.summary && <div>{aiRes.summary}</div>}
            {aiRes.strengths.length > 0 && <div><div class="muted small bold" style="margin:6px 0 4px">STRENGTHS</div>{aiRes.strengths.map((x, i) => <div key={i} class="small">✓ {x}</div>)}</div>}
            {aiRes.weakPoints.length > 0 && <div><div class="muted small bold" style="margin:6px 0 4px">BRING UP</div>{aiRes.weakPoints.map((x, i) => <div key={i} class="small">↗ <b>{MUSCLES[x.muscle]?.label || x.muscle}</b>: {x.note}</div>)}</div>}
            {aiRes.weakPoints.length > 0 && <Btn size="sm" variant="secondary" icon={Wand2} onClick={() => openProgramBuilder({ focus: aiRes.weakPoints.map((w) => w.muscle).filter((m) => MUSCLES[m]) })}>Build a plan for these</Btn>}
          </div></Card>
        )}
        <div class="notice"><Info size={20} /><div>{note || 'Fill in the fields above to see your estimate.'} Estimates are for tracking trends – not a medical diagnosis.</div></div>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- measurements
const SITES = [
  ['neck', 'Neck'], ['shoulders', 'Shoulders'], ['chest', 'Chest'], ['waist', 'Waist'], ['hips', 'Hips'],
  ['bicepL', 'Bicep (L)'], ['bicepR', 'Bicep (R)'], ['forearmL', 'Forearm (L)'], ['forearmR', 'Forearm (R)'],
  ['thighL', 'Thigh (L)'], ['thighR', 'Thigh (R)'], ['calfL', 'Calf (L)'], ['calfR', 'Calf (R)'],
];
export const SITE_LABEL = Object.fromEntries(SITES);

function MeasurementsPage() {
  const s = useStore();
  const u = s.profile.units;
  const cur = latestMeasures(s);
  const [v, setV] = useState({});
  const val = (k) => (k in v ? v[k] : cur[k] ?? null);
  const save = () => { logMeasures(Object.fromEntries(SITES.map(([k]) => [k, val(k)]))); toast('Measurements saved', 'good'); closeTop(); };
  const history = [...s.measures].sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 4);
  return (
    <Page title="Measurements" subtitle={`Tape, in ${lenUnit(u)}`} footer={<Btn block size="lg" onClick={save}>Save</Btn>}>
      <div class="stack">
        <div class="notice"><Ruler size={20} /><div>Measure relaxed, same time of day, same spot. Shoulders = widest point around the deltoids. Left/right values power the Symmetry check.</div></div>
        <div class="grid2">{SITES.map(([k, l]) => <LengthInput key={k} label={l} cm={val(k)} units={u} onChange={(x) => setV((o) => ({ ...o, [k]: x }))} />)}</div>
        {history.length > 0 && <div><div class="muted small bold" style="margin:6px 0 8px">HISTORY</div><div class="list">{history.map((h) => <div class="row" key={h.d}><div class="row-main"><div class="row-title">{h.d}</div><div class="row-sub">{SITES.filter(([k]) => h[k]).slice(0, 4).map(([k, l]) => `${l} ${round(u === 'imperial' ? h[k] / 2.54 : h[k], 1)}`).join(' · ')}</div></div></div>)}</div></div>}
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- symmetry
function SymmetryPage() {
  const s = useStore();
  const m = latestMeasures(s);
  const rep = symmetryReport({ sex: s.profile.sex, m });
  const tone = (st) => (st === 'great' ? 'good' : st === 'good' ? 'warn' : 'bad');
  const word = (st) => (st === 'great' ? 'Great' : st === 'good' ? 'Good' : 'Work on it');
  return (
    <Page title="Symmetry check" subtitle="Proportions & left/right balance"
      footer={rep.focus.length ? <Btn block size="lg" icon={Wand2} onClick={() => { closeTop(); setTimeout(() => openProgramBuilder({ focus: rep.focus }), 280); }}>Build plan for weak points</Btn> : <Btn block size="lg" variant="secondary" icon={Ruler} onClick={() => openMeasurements()}>Log measurements</Btn>}>
      {!rep.items.length ? (
        <div class="stack">
          <div class="notice"><Ruler size={20} /><div>Add tape measurements (shoulders, waist, and left/right arms, thighs and calves) to see your symmetry score.</div></div>
          <Btn block onClick={() => openMeasurements()}>Log measurements</Btn>
        </div>
      ) : (
        <div class="stack">
          <div class="hero center">
            <div class="muted small bold">SYMMETRY SCORE</div>
            <div style="display:flex;justify-content:center;margin:12px 0"><Ring value={rep.overall} max={100} size={150} stroke={14}><div class="big num" style="font-size:44px">{rep.overall}</div><div class="lbl">out of 100</div></Ring></div>
            <div class="muted small">{rep.overall >= 90 ? 'Excellent balance' : rep.overall >= 78 ? 'Solid – a few things to fine-tune' : 'Clear room to improve proportions'}</div>
          </div>
          <Card pad={false} class="list">
            {rep.items.map((i) => (
              <div class="sym-row" style="padding:14px 16px" key={i.id}>
                <div class="grow"><div class="row-flex spread"><b>{i.label}</b><Badge tone={tone(i.status)}>{word(i.status)}</Badge></div>
                  <div class="muted small" style="margin-top:3px">{i.kind === 'pair' ? `${round(i.value, 1)}% difference` : i.kind === 'ratio' ? `${round(i.value, 2)}${i.unit} (ideal ≈ ${i.ideal})` : `${round(i.value, 1)}${i.unit}`}</div>
                  <div class="small" style="margin-top:5px;color:var(--text2)">{i.tip}</div></div>
              </div>
            ))}
          </Card>
          <div class="notice"><Info size={20} /><div>"Ideal" ratios are classic aesthetic benchmarks (e.g. golden-ratio V-taper), not health targets. Use them for direction, not judgement.</div></div>
          <Btn block variant="secondary" icon={Ruler} onClick={() => openMeasurements()}>Update measurements</Btn>
        </div>
      )}
    </Page>
  );
}
