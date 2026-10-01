import { useState } from 'preact/hooks';
import { Plus, Play, Wand2, Dumbbell, MoreVertical, Copy, Pencil, Trash2, History as HistoryIcon, Library, Trophy, ChevronRight, Flame, Repeat } from 'lucide-preact';
import { Card, Btn, Section, Sheet, Page, Row, Empty, Badge, cx, Progress as Bar } from '../ui/kit.jsx';
import { openPage, openSheet, closeTop, confirmDialog, settled, toast, setTab } from '../ui/nav.js';
import { useStore, startWorkout, saveRoutine, deleteRoutine, deleteWorkout, nextRoutine } from '../lib/store.js';
import { getExercise, MUSCLES, MUSCLE_ORDER } from '../lib/exercises.js';
import { estimateMinutes } from '../lib/generator.js';
import { muscleSets, weekWorkouts } from '../lib/selectors.js';
import { fmtDayLong, fmtDay, fmtDurationShort, dispWeight, weightUnit, fmtNum, uid, fmtMonthYear, weekStart, round } from '../lib/util.js';
import { WorkoutPage } from './Workout.jsx';
import { openRoutineEditor, openProgramBuilder } from './Programs.jsx';
import { openLibrary } from './Exercises.jsx';

function RoutineMenu({ routine }) {
  return (
    <Sheet title={routine.name}>
      <div class="list">
        <Row icon={Pencil} title="Edit" onClick={() => { closeTop(); setTimeout(() => openRoutineEditor(routine), 260); }} />
        <Row icon={Copy} title="Duplicate" onClick={() => { saveRoutine({ ...structuredClone(routine), id: uid(), name: routine.name + ' (copy)', programId: null }); toast('Duplicated'); closeTop(); }} />
        <Row icon={Trash2} title="Delete" danger onClick={async () => { const ok = await confirmDialog({ title: `Delete "${routine.name}"?`, confirmLabel: 'Delete', danger: true }); if (!ok) return; await settled(); deleteRoutine(routine.id); closeTop(); }} />
      </div>
    </Sheet>
  );
}

function HistoryItem({ h, u, onClick }) {
  return (
    <button class="food pressable" style="width:100%;text-align:left" onClick={onClick}>
      <div class="grow"><div class="n">{h.name}</div><div class="s">{fmtDayLong(h.date)} · {fmtDurationShort(h.durationSec)} · {h.sets} sets{h.prCount ? ` · 🏆 ${h.prCount}` : ''}</div></div>
      <ChevronRight size={18} class="muted" />
    </button>
  );
}

function WorkoutDetail({ id }) {
  const s = useStore();
  const h = s.history.find((x) => x.id === id);
  const u = s.profile.units;
  if (!h) return <Page title="Workout"><Empty title="Not found" /></Page>;
  const repeat = () => { if (s.active) { toast('Finish your current workout first'); return; } startWorkout({ name: h.name, exercises: h.exercises.map((e) => ({ exId: e.exId, sets: e.sets.length, note: '' })) }); closeTop(); setTimeout(() => openPage(WorkoutPage), 260); };
  return (
    <Page title={h.name} subtitle={`${fmtDayLong(h.date)} · ${fmtDurationShort(h.durationSec)}`}
      right={<button class="iconbtn" aria-label="Delete" onClick={async () => { const ok = await confirmDialog({ title: 'Delete this workout?', message: 'This also removes it from your records.', confirmLabel: 'Delete', danger: true }); if (!ok) return; await settled(); deleteWorkout(id); closeTop(); }}><Trash2 size={21} /></button>}
      footer={<Btn block size="lg" icon={Repeat} onClick={repeat}>Repeat workout</Btn>}>
      <div class="stack">
        <div class="grid3">
          <div class="stat"><div class="v num">{fmtDurationShort(h.durationSec)}</div><div class="l">Time</div></div>
          <div class="stat"><div class="v num">{fmtNum(dispWeight(h.volume, u, 0))}</div><div class="l">Volume {weightUnit(u)}</div></div>
          <div class="stat"><div class="v num">{h.sets}</div><div class="l">Sets</div></div>
        </div>
        {h.exercises.map((e, i) => {
          const d = getExercise(e.exId);
          return (
            <Card key={i}>
              <div class="spread"><div class="bold">{d.name}</div>{e.prs?.length ? <span class="pr"><Trophy size={13} />PR</span> : null}</div>
              <div style="margin-top:8px" class="stack-sm">
                {e.sets.map((x, j) => (
                  <div class="spread small" key={j}><span class="muted">{x.kind === 'warmup' ? 'Warm-up' : `Set ${e.sets.slice(0, j).filter((q) => q.kind !== 'warmup').length + 1}`}</span>
                    <b class="num">{d.type === 'wr' ? `${dispWeight(x.w, u)} ${weightUnit(u)} × ${x.r}` : d.type === 'br' ? `${x.w ? '+' + dispWeight(x.w, u) + ' × ' : ''}${x.r} reps` : d.type === 'time' ? `${x.t}s` : `${x.m} min${x.d ? ' · ' + x.d + ' km' : ''}`}</b></div>
                ))}
              </div>
              {e.note && <div class="muted small" style="margin-top:8px">“{e.note}”</div>}
            </Card>
          );
        })}
        {h.notes && <div class="notice"><div>{h.notes}</div></div>}
      </div>
    </Page>
  );
}

function HistoryPage() {
  const s = useStore();
  const u = s.profile.units;
  let last = '';
  return (
    <Page title="History" subtitle={`${s.history.length} workouts`}>
      {!s.history.length && <Empty icon={HistoryIcon} title="No workouts yet" text="Finish your first workout and it'll appear here." />}
      {s.history.map((h) => {
        const m = fmtMonthYear(h.date); const head = m !== last; last = m;
        return <div key={h.id}>{head && <div class="month-label">{m}</div>}<div class="list" style="margin-bottom:8px"><HistoryItem h={h} u={u} onClick={() => openPage(WorkoutDetail, { id: h.id })} /></div></div>;
      })}
    </Page>
  );
}

export function Train() {
  const s = useStore();
  const u = s.profile.units;
  const next = nextRoutine(s);
  const sets = muscleSets(weekWorkouts(s));
  const musc = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];
  const start = (routine) => { if (s.active) { openPage(WorkoutPage); return; } startWorkout(routine ? { routine } : { name: 'Quick workout' }); openPage(WorkoutPage); };

  return (
    <>
      <div class="screen-head"><div><div class="sub">{s.program ? s.program.name : 'Your routines'}</div><h1>Train</h1></div>
        <button class="iconbtn" style="background:var(--card2)" aria-label="Exercise library" onClick={() => openLibrary()}><Library size={22} /></button></div>

      {s.active ? (
        <Card class="accent-card" onClick={() => openPage(WorkoutPage)}><div class="spread"><div><div class="bold" style="font-size:18px">{s.active.name}</div><div class="muted small">Workout in progress</div></div><Play size={28} fill="currentColor" /></div></Card>
      ) : (
        <div class="grid2">
          <Btn size="lg" icon={Play} onClick={() => start(null)}>Quick start</Btn>
          <Btn size="lg" variant="secondary" icon={Wand2} onClick={() => openProgramBuilder()}>Build plan</Btn>
        </div>
      )}

      <Section title="Routines" action="New" onAction={() => openRoutineEditor()}>
        {!s.routines.length ? (
          <Card><Empty icon={Dumbbell} title="No routines yet" text="Generate a full program in seconds, or build your own." action={<Btn onClick={() => openProgramBuilder()} icon={Wand2}>Build a program</Btn>} /></Card>
        ) : (
          <div class="stack-sm">
            {s.routines.map((r) => (
              <Card class="rt-card" key={r.id}>
                <div class="spread"><div class="row-flex" style="gap:8px"><h3>{r.name}</h3>{next?.id === r.id && <Badge tone="accent">Up next</Badge>}</div>
                  <button class="iconbtn" aria-label="Routine menu" style="margin:-6px -8px" onClick={() => openSheet(RoutineMenu, { routine: r })}><MoreVertical size={20} /></button></div>
                <div class="ex-line">{r.exercises.slice(0, 5).map((e) => getExercise(e.exId).name).join(' · ')}{r.exercises.length > 5 ? ` +${r.exercises.length - 5} more` : ''}</div>
                <div class="spread" style="margin-top:12px"><div class="muted small">{r.exercises.length} exercises · ~{estimateMinutes(r)} min</div><Btn size="sm" icon={Play} onClick={() => start(r)}>Start</Btn></div>
              </Card>
            ))}
          </div>
        )}
        {s.program?.notes?.length > 0 && <div class="muted small" style="margin:12px 4px 0">💡 {s.program.notes[0]}</div>}
      </Section>

      <Section title="Muscle balance" sub="Working sets this week (aim for 10–20 per muscle)">
        <Card>
          <div class="stack-sm">
            {musc.map((m) => {
              const v = Math.round((sets[m] || 0) * 10) / 10;
              return (
                <div class="row-flex" key={m}>
                  <div style="width:84px" class="small bold row-flex gap8"><span class="muscle-dot" style={{ background: MUSCLES[m].color }} />{MUSCLES[m].label}</div>
                  <div class="grow"><Bar value={v} max={20} color={v >= 10 ? MUSCLES[m].color : `color-mix(in srgb, ${MUSCLES[m].color} 55%, var(--card3))`} height={9} /></div>
                  <div class="num small bold" style="width:26px;text-align:right">{v ? round(v) : 0}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </Section>

      <Section title="History" action={s.history.length ? 'See all' : undefined} onAction={() => openPage(HistoryPage)}>
        {!s.history.length ? <Card class="flat"><div class="muted center small" style="padding:10px">Your finished workouts show up here.</div></Card> : (
          <div class="list">{s.history.slice(0, 4).map((h) => <HistoryItem key={h.id} h={h} u={u} onClick={() => openPage(WorkoutDetail, { id: h.id })} />)}</div>
        )}
      </Section>
    </>
  );
}
