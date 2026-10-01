import { useState } from 'preact/hooks';
import { Plus, Trash2, Sparkles, Wand2, RefreshCw, Check, GripVertical, ArrowUp, ArrowDown, Info, Dices } from 'lucide-preact';
import { Page, Sheet, Btn, Field, Segmented, Chip, Card, Stepper, NumInput, cx, Badge, Empty, Spinner } from '../ui/kit.jsx';
import { closeTop, openPage, openSheet, toast, confirmDialog, settled } from '../ui/nav.js';
import { useStore, saveRoutine, installProgram, getAge, deleteRoutine } from '../lib/store.js';
import { getExercise, MUSCLES, MUSCLE_ORDER } from '../lib/exercises.js';
import { generateProgram, sanitizeAiProgram, estimateMinutes, PROGRAM_GOALS, EXPERIENCE, EQUIP_PRESETS } from '../lib/generator.js';
import { aiWorkoutPlan, resolveProvider } from '../lib/ai.js';
import { uid } from '../lib/util.js';
import { ExIcon, openExercisePicker } from './Exercises.jsx';

// ---------------------------------------------------------------- routine editor
export const openRoutineEditor = (routine) => openPage(RoutineEditor, { routine });

function RoutineEditor({ routine }) {
  const [r, setR] = useState(() => routine ? structuredClone(routine) : { id: uid(), name: 'New routine', exercises: [], notes: '' });
  const upd = (i, p) => setR((x) => ({ ...x, exercises: x.exercises.map((e, j) => (j === i ? { ...e, ...p } : e)) }));
  const move = (i, d) => setR((x) => { const a = [...x.exercises]; const j = i + d; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, exercises: a }; });
  const save = () => { if (!r.exercises.length) { toast('Add at least one exercise'); return; } saveRoutine({ ...r, name: r.name.trim() || 'Routine' }); toast('Routine saved', 'good'); closeTop(); };
  return (
    <Page title={routine ? 'Edit routine' : 'New routine'} right={<Btn size="sm" onClick={save}>Save</Btn>}>
      <div class="stack">
        <Field label="Name"><input class="input" value={r.name} onInput={(e) => setR({ ...r, name: e.currentTarget.value })} /></Field>
        {r.exercises.map((e, i) => {
          const def = getExercise(e.exId);
          const secs = def.type === 'time', cardio = def.type === 'cardio';
          return (
            <div class="ex-card" key={i + e.exId}>
              <div class="ex-head"><ExIcon ex={def} /><div class="grow"><div class="ex-name">{def.name}</div><div class="ex-meta">{MUSCLES[def.muscle]?.label}</div></div>
                <button class="iconbtn" onClick={() => move(i, -1)} aria-label="Up"><ArrowUp size={19} /></button>
                <button class="iconbtn" onClick={() => move(i, 1)} aria-label="Down"><ArrowDown size={19} /></button>
                <button class="iconbtn" onClick={() => setR((x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== i) }))} aria-label="Remove"><Trash2 size={19} /></button></div>
              <div class="grid3">
                {!cardio && <Field label="Sets"><Stepper value={e.sets} min={1} max={10} onChange={(v) => upd(i, { sets: v })} /></Field>}
                <Field label={secs ? 'Seconds' : cardio ? 'Minutes' : 'Reps'}>
                  <div class="row-flex" style="gap:4px"><NumInput value={e.repMin} decimals={0} onChange={(v) => upd(i, { repMin: v || 1 })} /><span class="muted">–</span><NumInput value={e.repMax} decimals={0} onChange={(v) => upd(i, { repMax: v || e.repMin })} /></div>
                </Field>
                {!cardio && <Field label="Rest (s)"><NumInput value={e.rest} decimals={0} onChange={(v) => upd(i, { rest: v ?? 0 })} /></Field>}
              </div>
            </div>
          );
        })}
        <Btn block variant="secondary" icon={Plus} onClick={() => openExercisePicker({ onPick: (ids) => setR((x) => ({ ...x, exercises: [...x.exercises, ...ids.map((id) => { const d = getExercise(id); return { exId: id, sets: d.type === 'cardio' ? 1 : 3, repMin: d.type === 'time' ? 30 : d.type === 'cardio' ? 15 : 8, repMax: d.type === 'time' ? 60 : d.type === 'cardio' ? 30 : 12, rest: d.mech === 'compound' ? 120 : 75, note: '' }; })] })) })}>Add exercise</Btn>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- program builder
export const openProgramBuilder = (props = {}) => openPage(ProgramBuilder, props);

function ProgramBuilder({ focus: focus0 = [] }) {
  const s = useStore();
  const p = s.profile;
  const age = getAge(p);
  const [cfg, setCfg] = useState({
    goal: p.goal === 'lose' ? 'fatloss' : p.goal === 'gain' || p.goal === 'recomp' ? 'muscle' : 'general',
    days: p.daysPerWeek, minutes: p.minutes, experience: p.experience,
    equip: EQUIP_PRESETS.find((e) => JSON.stringify([...e.equip].sort()) === JSON.stringify([...(p.equipment || [])].filter((x) => x !== 'other').sort()))?.id || 'gym',
    focus: focus0, request: '',
  });
  const [prog, setProg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (x) => setCfg((c) => ({ ...c, ...x }));
  const equip = EQUIP_PRESETS.find((e) => e.id === cfg.equip).equip;
  const ai = resolveProvider(s.settings.ai);

  const local = () => { setErr(null); setProg(generateProgram({ goal: cfg.goal, days: cfg.days, minutes: cfg.minutes, equip, experience: cfg.experience, focus: cfg.focus })); };
  const withAi = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await aiWorkoutPlan(s.settings.ai, { request: cfg.request, profile: p, days: cfg.days, minutes: cfg.minutes, equip, experience: cfg.experience, goal: PROGRAM_GOALS.find((g) => g.id === cfg.goal).label, age });
      const clean = sanitizeAiProgram(r.raw);
      if (!clean) throw new Error('The AI plan used exercises we do not have. Try again – or use the instant generator.');
      setProg(clean);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const use = () => { installProgram(prog); toast('Program saved to your routines', 'good'); closeTop(); };

  if (prog) {
    return (
      <Page title="Your program" subtitle={prog.split || (prog.ai ? 'Designed by AI' : '')} onBack={() => setProg(null)}
        footer={<div class="grid2"><Btn variant="secondary" icon={RefreshCw} onClick={() => (prog.ai ? withAi() : local())} loading={busy}>Redo</Btn><Btn icon={Check} onClick={use}>Use program</Btn></div>}>
        <div class="stack">
          <div class="hero"><div class="bold" style="font-size:20px">{prog.name}</div><div class="muted small" style="margin-top:4px">{prog.routines.length} workouts / week · ~{estimateMinutes(prog.routines[0])} min each</div></div>
          {prog.routines.map((r) => (
            <Card key={r.id}>
              <div class="spread"><div class="bold" style="font-size:17px">{r.name}</div><Badge>~{estimateMinutes(r)} min</Badge></div>
              <div style="margin-top:10px" class="stack-sm">
                {r.exercises.map((e, i) => { const d = getExercise(e.exId); return (
                  <div class="row-flex" key={i}><span class="muscle-dot" style={{ background: MUSCLES[d.muscle]?.color }} /><div class="grow small bold">{d.name}</div><span class="muted small num">{d.type === 'cardio' ? `${e.repMin}–${e.repMax} min` : `${e.sets} × ${e.repMin}${e.repMax !== e.repMin ? '–' + e.repMax : ''}${d.type === 'time' ? 's' : ''}`}</span></div>
                ); })}
              </div>
              {r.notes && <div class="muted small" style="margin-top:10px">{r.notes}</div>}
            </Card>
          ))}
          {(prog.notes || []).length > 0 && <div class="notice"><Info size={20} /><div>{prog.notes.map((n, i) => <div key={i} style={i ? 'margin-top:6px' : ''}>• {n}</div>)}</div></div>}
        </div>
      </Page>
    );
  }

  return (
    <Page title="Build a program" footer={
      <div class="stack-sm">
        <Btn block size="lg" icon={Wand2} onClick={local}>Generate instantly (offline)</Btn>
        <Btn block variant="secondary" icon={Sparkles} loading={busy} onClick={withAi}>{busy ? 'AI is designing…' : 'Design with AI'}</Btn>
      </div>}>
      <div class="stack">
        <Field label="Goal"><div class="chips">{PROGRAM_GOALS.map((g) => <Chip key={g.id} on={cfg.goal === g.id} onClick={() => set({ goal: g.id })}>{g.label}</Chip>)}</div></Field>
        <Field label="Days per week"><Segmented options={[2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: String(n) }))} value={String(cfg.days)} onChange={(v) => set({ days: +v })} /></Field>
        <Field label="Session length"><Segmented options={[30, 45, 60, 75, 90].map((n) => ({ id: String(n), label: `${n}m` }))} value={String(cfg.minutes)} onChange={(v) => set({ minutes: +v })} /></Field>
        <Field label="Experience"><Segmented options={EXPERIENCE.map((e) => ({ id: e.id, label: e.label }))} value={cfg.experience} onChange={(v) => set({ experience: v })} /></Field>
        <Field label="Equipment"><div class="chips">{EQUIP_PRESETS.map((e) => <Chip key={e.id} on={cfg.equip === e.id} onClick={() => set({ equip: e.id })}>{e.label}</Chip>)}</div></Field>
        <Field label="Bring up (optional)" hint="Adds extra isolation work for lagging muscles."><div class="chips">{['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'].map((m) => <Chip key={m} on={cfg.focus.includes(m)} onClick={() => set({ focus: cfg.focus.includes(m) ? cfg.focus.filter((x) => x !== m) : [...cfg.focus, m] })}>{MUSCLES[m].label}</Chip>)}</div></Field>
        <Field label="Tell the AI what you want (optional)"><textarea class="input" rows="2" placeholder="e.g. bigger arms and shoulders, bad left knee, 4 short sessions" value={cfg.request} onInput={(e) => set({ request: e.currentTarget.value })} /></Field>
        {err && <div class="notice bad"><Info size={20} /><div>{err}</div></div>}
        <div class="muted small center">AI planner: {ai.name}{ai.configured ? '' : ' – add a key in Settings → AI'}</div>
      </div>
    </Page>
  );
}
