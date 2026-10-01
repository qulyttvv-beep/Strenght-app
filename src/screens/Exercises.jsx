import { useState, useMemo } from 'preact/hooks';
import { Search, Plus, Check, Dumbbell, Trophy, Info } from 'lucide-preact';
import { Page, Sheet, Btn, Chip, Field, Segmented, Card, Empty, cx, NumInput } from '../ui/kit.jsx';
import { LineChart } from '../ui/charts.jsx';
import { BodyMap } from '../ui/bodymap.jsx';
import { openPage, openSheet, closeTop, toast } from '../ui/nav.js';
import { useStore, addCustomExercise, deleteCustomExercise, computeRecords } from '../lib/store.js';
import { allExercises, getExercise, MUSCLES, MUSCLE_ORDER, EQUIPMENT, TYPE_LABEL } from '../lib/exercises.js';
import { epley1RM } from '../lib/calc.js';
import { uid, fmtDay, dispWeight, weightUnit, round } from '../lib/util.js';

export const MuscleDot = ({ m }) => <span class="muscle-dot" style={{ background: MUSCLES[m]?.color }} />;
export const ExIcon = ({ ex }) => (
  <div class="ex-ico" style={{ background: `color-mix(in srgb, ${MUSCLES[ex.muscle]?.color || '#888'} 20%, var(--card3))`, color: MUSCLES[ex.muscle]?.color }}>{(MUSCLES[ex.muscle]?.label || '?').slice(0, 2).toUpperCase()}</div>
);

/** onPick(ids[]) is called with the chosen exercise ids. */
export const openExercisePicker = (props) => openPage(ExercisePicker, props);

function ExercisePicker({ onPick, multi = true, title = 'Add exercises' }) {
  const s = useStore();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('all');
  const [equip, setEquip] = useState('all');
  const [sel, setSel] = useState([]);
  const list = useMemo(() => {
    const t = q.toLowerCase().split(/\s+/).filter(Boolean);
    return allExercises().filter((e) => (muscle === 'all' || e.muscle === muscle) && (equip === 'all' || e.equip === equip) && t.every((w) => e.name.toLowerCase().includes(w)));
  }, [q, muscle, equip, s.customEx.length]);
  const toggle = (id) => setSel((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));
  const pick = (id) => { if (!multi) { onPick([id]); closeTop(); } else toggle(id); };
  const done = () => { onPick(sel); closeTop(); };
  return (
    <Page title={title} right={<button class="link" style="padding:10px" onClick={() => openSheet(CustomExerciseSheet)}>+ Custom</button>}
      footer={multi && sel.length ? <Btn block size="lg" onClick={done}>Add {sel.length} exercise{sel.length > 1 ? 's' : ''}</Btn> : null}>
      <div class="stack-sm">
        <div class="searchbox"><Search size={19} /><input class="input" placeholder="Search exercises…" value={q} onInput={(e) => setQ(e.currentTarget.value)} /></div>
        <div class="chips scroll"><Chip on={muscle === 'all'} onClick={() => setMuscle('all')}>All</Chip>{MUSCLE_ORDER.map((m) => <Chip key={m} on={muscle === m} onClick={() => setMuscle(m)}>{MUSCLES[m].label}</Chip>)}</div>
        <div class="chips scroll"><Chip on={equip === 'all'} onClick={() => setEquip('all')}>Any equipment</Chip>{Object.entries(EQUIPMENT).map(([k, v]) => <Chip key={k} on={equip === k} onClick={() => setEquip(k)}>{v}</Chip>)}</div>
      </div>
      <div class="list" style="margin-top:14px">
        {list.map((e) => (
          <div class="row pressable" key={e.id} onClick={() => pick(e.id)}>
            <ExIcon ex={e} />
            <div class="row-main"><div class="row-title">{e.name}</div><div class="row-sub">{MUSCLES[e.muscle].label} · {EQUIPMENT[e.equip]}</div></div>
            <button class="iconbtn" aria-label="Info" onClick={(ev) => { ev.stopPropagation(); openSheet(ExerciseDetail, { id: e.id }); }}><Info size={19} /></button>
            {multi && <span class="checkbox" style={sel.includes(e.id) ? 'background:var(--accent);border-color:var(--accent)' : ''}>{sel.includes(e.id) && <Check size={15} strokeWidth={3.2} />}</span>}
          </div>
        ))}
        {!list.length && <Empty icon={Search} title="No exercises match" action={<Btn size="sm" onClick={() => openSheet(CustomExerciseSheet)}>Create custom exercise</Btn>} />}
      </div>
    </Page>
  );
}

export function CustomExerciseSheet() {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('chest');
  const [equip, setEquip] = useState('dumbbell');
  const [type, setType] = useState('wr');
  const save = () => {
    if (!name.trim()) return;
    addCustomExercise({ id: 'x-' + uid(), name: name.trim(), muscle, sec: [], equip, mech: 'compound', type, pat: 'custom', pri: 3, cue: 'Custom exercise', custom: true });
    toast('Exercise created', 'good'); closeTop();
  };
  return (
    <Sheet title="Custom exercise" footer={<Btn block size="lg" disabled={!name.trim()} onClick={save}>Create</Btn>}>
      <div class="stack">
        <Field label="Name"><input class="input" placeholder="e.g. Cable Y-Raise" value={name} onInput={(e) => setName(e.currentTarget.value)} /></Field>
        <Field label="Main muscle"><div class="chips">{MUSCLE_ORDER.map((m) => <Chip key={m} on={muscle === m} onClick={() => setMuscle(m)}>{MUSCLES[m].label}</Chip>)}</div></Field>
        <Field label="Equipment"><div class="chips">{Object.entries(EQUIPMENT).map(([k, v]) => <Chip key={k} on={equip === k} onClick={() => setEquip(k)}>{v}</Chip>)}</div></Field>
        <Field label="Tracking"><Segmented size="sm" value={type} onChange={setType} options={[{ id: 'wr', label: 'Weight×reps' }, { id: 'br', label: 'Bodyweight' }, { id: 'time', label: 'Time' }]} /></Field>
      </div>
    </Sheet>
  );
}

export function ExerciseDetail({ id }) {
  const s = useStore();
  const ex = getExercise(id);
  const u = s.profile.units;
  const sessions = s.history.filter((h) => h.exercises.some((e) => e.exId === id)).slice(0, 12).reverse();
  const pts = sessions.map((h, i) => {
    const e = h.exercises.find((x) => x.exId === id);
    const best = Math.max(0, ...e.sets.filter((x) => x.kind !== 'warmup').map((x) => (ex.type === 'wr' ? epley1RM(x.w, x.r) : x.r || x.t || 0)));
    return { x: i, y: ex.type === 'wr' ? +dispWeight(best, u) : best, d: h.date };
  });
  const rec = computeRecords(s.history)[id];
  return (
    <Sheet title={ex.name} tall={pts.length > 1}>
      <div class="stack">
        <div class="chips"><span class="chip on"><MuscleDot m={ex.muscle} />{MUSCLES[ex.muscle].label}</span>{ex.sec.map((m) => <span class="chip" key={m}>{MUSCLES[m]?.label}</span>)}<span class="chip">{EQUIPMENT[ex.equip]}</span></div>
        <div style="max-width:260px;margin:0 auto;width:100%"><BodyMap weights={{ ...Object.fromEntries(ex.sec.map((m) => [m, 0.45])), [ex.muscle]: 1 }} labels={false} /></div>
        {ex.cue && <div class="notice"><Dumbbell size={20} /><div>{ex.cue}</div></div>}
        {rec && ex.type === 'wr' && (
          <div class="grid3">
            <div class="stat"><div class="v">{dispWeight(rec.weight, u)}</div><div class="l">Heaviest {weightUnit(u)}</div></div>
            <div class="stat"><div class="v">{dispWeight(rec.e1rm, u, 0)}</div><div class="l">Est. 1RM</div></div>
            <div class="stat"><div class="v">{rec.reps}</div><div class="l">Most reps</div></div>
          </div>
        )}
        {pts.length > 1 && <Card><div class="muted small bold" style="margin-bottom:6px">{ex.type === 'wr' ? `ESTIMATED 1RM (${weightUnit(u)})` : 'BEST SET'}</div><LineChart points={pts} height={160} /></Card>}
        {!sessions.length && <div class="muted center small">No history yet – log this exercise in a workout to see progress here.</div>}
        {ex.custom && <Btn variant="danger" block onClick={() => { deleteCustomExercise(id); closeTop(); }}>Delete custom exercise</Btn>}
      </div>
    </Sheet>
  );
}

export const openLibrary = () => openPage(LibraryPage);
function LibraryPage() {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('all');
  useStore();
  const list = allExercises().filter((e) => (muscle === 'all' || e.muscle === muscle) && e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Page title="Exercise library" subtitle={`${allExercises().length} exercises`} right={<button class="link" style="padding:10px" onClick={() => openSheet(CustomExerciseSheet)}>+ Custom</button>}>
      <div class="stack-sm">
        <div class="searchbox"><Search size={19} /><input class="input" placeholder="Search…" value={q} onInput={(e) => setQ(e.currentTarget.value)} /></div>
        <div class="chips scroll"><Chip on={muscle === 'all'} onClick={() => setMuscle('all')}>All</Chip>{MUSCLE_ORDER.map((m) => <Chip key={m} on={muscle === m} onClick={() => setMuscle(m)}>{MUSCLES[m].label}</Chip>)}</div>
      </div>
      <div class="list" style="margin-top:14px">
        {list.map((e) => (
          <div class="row pressable" key={e.id} onClick={() => openSheet(ExerciseDetail, { id: e.id })}>
            <ExIcon ex={e} /><div class="row-main"><div class="row-title">{e.name}</div><div class="row-sub">{MUSCLES[e.muscle].label} · {EQUIPMENT[e.equip]}</div></div>
          </div>
        ))}
      </div>
    </Page>
  );
}
