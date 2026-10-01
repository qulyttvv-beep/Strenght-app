import { useState, useRef } from 'preact/hooks';
import { Check, ChevronDown, MoreVertical, Plus, Trash2, Timer, ArrowUp, ArrowDown, Replace, Trophy, Flame, X, Clock } from 'lucide-preact';
import { Page, Sheet, Btn, Card, Empty, Stepper, Segmented, cx, NumInput, Badge } from '../ui/kit.jsx';
import { Confetti } from '../ui/confetti.jsx';
import { closeTop, openSheet, openPage, swapTop, confirmDialog, settled, toast } from '../ui/nav.js';
import {
  useStore, updateActiveSet, addActiveSet, removeActiveSet, updateActiveExercise, removeExerciseFromActive, moveActiveExercise,
  replaceActiveExercise, addExerciseToActive, finishWorkout, discardWorkout, computeRecords, setActiveMeta,
} from '../lib/store.js';
import { getExercise, MUSCLES } from '../lib/exercises.js';
import { epley1RM } from '../lib/calc.js';
import { useRest, startRest, addRest, skipRest } from '../lib/rest.js';
import { useNow } from '../ui/hooks.js';
import { fmtDuration, fmtDurationShort, dispWeight, parseWeight, weightUnit, vibrate, round, uid, fmtDayLong, fmtNum } from '../lib/util.js';
import { ExIcon, openExercisePicker, ExerciseDetail } from './Exercises.jsx';

const KIND = { normal: 'Normal set', warmup: 'Warm-up', drop: 'Drop set', fail: 'Failure' };

function SetKindSheet({ exKey, setId, idx }) {
  const s = useStore();
  const set = s.active?.exercises.find((e) => e.key === exKey)?.sets.find((x) => x.id === setId);
  if (!set) return null;
  return (
    <Sheet title={`Set ${idx + 1}`}>
      <div class="stack-sm">
        {Object.entries(KIND).map(([k, l]) => (
          <button key={k} class={cx('checkrow', set.kind === k && 'on')} onClick={() => { updateActiveSet(exKey, setId, { kind: k }); closeTop(); }}>
            <span class="checkbox">{set.kind === k && <Check size={15} strokeWidth={3.2} />}</span><span class="row-main"><span class="row-title">{l}</span></span>
          </button>
        ))}
        <Btn variant="danger" block icon={Trash2} onClick={() => { removeActiveSet(exKey, setId); closeTop(); }}>Delete set</Btn>
      </div>
    </Sheet>
  );
}

function ExMenu({ exKey }) {
  const s = useStore();
  const ex = s.active?.exercises.find((e) => e.key === exKey);
  if (!ex) return null;
  return (
    <Sheet title={getExercise(ex.exId).name}>
      <div class="stack-sm">
        <div class="list">
          <div class="row pressable" onClick={() => { closeTop(); setTimeout(() => openExercisePicker({ multi: false, title: 'Replace with…', onPick: ([id]) => replaceActiveExercise(exKey, id) }), 260); }}><div class="row-icon"><Replace size={19} /></div><div class="row-main"><div class="row-title">Replace exercise</div></div></div>
          <div class="row pressable" onClick={() => { moveActiveExercise(exKey, -1); closeTop(); }}><div class="row-icon"><ArrowUp size={19} /></div><div class="row-main"><div class="row-title">Move up</div></div></div>
          <div class="row pressable" onClick={() => { moveActiveExercise(exKey, 1); closeTop(); }}><div class="row-icon"><ArrowDown size={19} /></div><div class="row-main"><div class="row-title">Move down</div></div></div>
        </div>
        <div class="spread card card-pad"><div><div class="bold">Rest timer</div><div class="muted small">Starts after each completed set</div></div><Stepper value={ex.rest} step={15} min={0} max={420} onChange={(v) => updateActiveExercise(exKey, { rest: v })} format={(v) => (v ? `${v}s` : 'Off')} /></div>
        <Btn variant="danger" block icon={Trash2} onClick={() => { removeExerciseFromActive(exKey); closeTop(); }}>Remove exercise</Btn>
      </div>
    </Sheet>
  );
}

function SetRow({ ex, def, set, idx, units, records, autoRest, haptics }) {
  const t = def.type;
  const kindCls = set.kind === 'warmup' ? 'warm' : set.kind === 'drop' ? 'drop' : set.kind === 'fail' ? 'fail' : '';
  const label = set.kind === 'warmup' ? 'W' : set.kind === 'drop' ? 'D' : set.kind === 'fail' ? 'F' : idx + 1;
  const prevTxt = !set.prev ? '–' : t === 'wr' ? `${dispWeight(set.prev.w, units)}×${set.prev.r ?? '–'}` : t === 'br' ? `${set.prev.w ? '+' + dispWeight(set.prev.w, units) + '×' : ''}${set.prev.r ?? '–'}` : t === 'time' ? `${set.prev.t || '–'}s` : `${set.prev.m || '–'}m`;
  const patch = (p) => updateActiveSet(ex.key, set.id, p);

  const toggle = () => {
    if (set.done) { patch({ done: false }); return; }
    const p = { done: true };
    if (t === 'wr' || t === 'br') { p.w = set.w ?? set.prev?.w ?? null; p.r = set.r ?? set.prev?.r ?? null; if (p.r == null) { toast('Enter the reps first'); return; } if (t === 'wr' && p.w == null) { toast('Enter the weight first'); return; } }
    else if (t === 'time') { p.t = set.t ?? set.prev?.t ?? null; if (p.t == null) { toast('Enter the seconds first'); return; } }
    else { p.m = set.m ?? set.prev?.m ?? null; if (p.m == null) { toast('Enter the minutes first'); return; } }
    patch(p);
    if (haptics) vibrate(12);
    if (t === 'wr' && set.kind !== 'warmup') {
      const rec = records[ex.exId];
      const e = epley1RM(p.w, p.r);
      if (rec && e > rec.e1rm * 1.001) { toast('🏆 New personal record!', 'good'); vibrate([30, 40, 60]); }
    }
    if (autoRest && ex.rest > 0) startRest(set.kind === 'warmup' ? 45 : ex.rest);
  };

  const cls = cx('set', set.done && 'done', (t === 'time') && 't2');
  return (
    <div class={cls}>
      <button class={cx('sn', kindCls)} onClick={() => openSheet(SetKindSheet, { exKey: ex.key, setId: set.id, idx })}>{label}</button>
      <div class="prev">{prevTxt}</div>
      {(t === 'wr' || t === 'br') && (<>
        <NumInput value={set.w == null ? null : dispWeight(set.w, units, 2)} decimals={2} placeholder={t === 'br' ? '+' : '0'} onChange={(v) => patch({ w: v == null ? null : parseWeight(v, units) })} />
        <NumInput value={set.r} decimals={0} placeholder="0" onChange={(v) => patch({ r: v == null ? null : Math.round(v) })} />
      </>)}
      {t === 'time' && <NumInput value={set.t} decimals={0} placeholder="sec" onChange={(v) => patch({ t: v == null ? null : Math.round(v) })} />}
      {t === 'cardio' && (<>
        <NumInput value={set.m} decimals={0} placeholder="min" onChange={(v) => patch({ m: v == null ? null : Math.round(v) })} />
        <NumInput value={set.d} decimals={2} placeholder="km" onChange={(v) => patch({ d: v })} />
      </>)}
      <button class="ck" onClick={toggle} aria-label="Complete set"><Check size={21} strokeWidth={3} /></button>
    </div>
  );
}

function ExCard({ ex, units, records, settings }) {
  const def = getExercise(ex.exId);
  const t = def.type;
  const head = t === 'wr' ? ['SET', 'PREV', units === 'imperial' ? 'LB' : 'KG', 'REPS', ''] : t === 'br' ? ['SET', 'PREV', '+' + weightUnit(units), 'REPS', ''] : t === 'time' ? ['SET', 'PREV', 'SECONDS', ''] : ['SET', 'PREV', 'MIN', 'KM', ''];
  const done = ex.sets.filter((s) => s.done).length;
  return (
    <div class="ex-card">
      <div class="ex-head">
        <ExIcon ex={def} />
        <div class="grow" onClick={() => openSheet(ExerciseDetail, { id: ex.exId })}>
          <div class="ex-name">{def.name}</div>
          <div class="ex-meta">{MUSCLES[def.muscle]?.label}{ex.target ? ` · target ${ex.target}${t === 'time' ? 's' : ' reps'}` : ''} · {done}/{ex.sets.length}</div>
        </div>
        <button class="iconbtn" aria-label="Exercise menu" onClick={() => openSheet(ExMenu, { exKey: ex.key })}><MoreVertical size={21} /></button>
      </div>
      <div class={cx('sets-head', t === 'time' && 't2')}>{head.map((h, i) => <div key={i}>{h}</div>)}</div>
      {ex.sets.map((s, i) => <SetRow key={s.id} ex={ex} def={def} set={s} idx={ex.sets.filter((x, j) => j < i && x.kind !== 'warmup').length} units={units} records={records} autoRest={settings.autoRest} haptics={settings.haptics} />)}
      <div style="padding:6px 2px 0"><button class="btn btn-secondary btn-sm btn-block" onClick={() => addActiveSet(ex.key)}><Plus size={16} />Add set</button></div>
      <input class="input" style="height:40px;margin-top:8px;font-size:14px;font-weight:550" placeholder="Notes…" value={ex.note} onInput={(e) => updateActiveExercise(ex.key, { note: e.currentTarget.value })} />
    </div>
  );
}

function RestPill() {
  const r = useRest();
  if (!r.active) return null;
  return (
    <div class="rest-pill">
      <Timer size={22} class="accent" />
      {r.done ? <div class="t accent" style="font-size:20px">Go! 💪</div> : <div class="t num">{fmtDuration(r.left)}</div>}
      <div class="rb"><i style={{ width: `${r.total ? (100 * (r.total - r.left)) / r.total : 100}%` }} /></div>
      <button class="btn btn-secondary btn-sm" onClick={() => addRest(15)}>+15</button>
      <button class="btn btn-ghost btn-sm" onClick={skipRest}>Skip</button>
    </div>
  );
}

export function WorkoutPage() {
  const s = useStore();
  const a = s.active;
  const now = useNow(1000, !!a);
  const records = computeRecords(s.history);
  if (!a) return <Page title="Workout"><Empty title="No active workout" /></Page>;
  const u = s.profile.units;
  const doneSets = a.exercises.flatMap((e) => e.sets.filter((x) => x.done && x.kind !== 'warmup' && getExercise(e.exId).type === 'wr'));
  const vol = doneSets.reduce((t, x) => t + (x.w || 0) * (x.r || 0), 0);
  const totalDone = a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  const pending = a.exercises.reduce((n, e) => n + e.sets.filter((x) => !x.done).length, 0);

  const finish = async () => {
    if (!totalDone) { toast('Complete at least one set first'); return; }
    if (pending) {
      const ok = await confirmDialog({ title: 'Finish workout?', message: `${pending} unfinished set${pending > 1 ? 's' : ''} will be left out.`, confirmLabel: 'Finish' });
      if (!ok) return;
      await settled();
    }
    skipRest();
    const res = finishWorkout();
    if (res) swapTop(WorkoutSummary, { item: res.item, prs: res.prs });
    else closeTop();
  };
  const cancel = async () => {
    const ok = await confirmDialog({ title: 'Discard workout?', message: 'Everything you logged in this session will be lost.', confirmLabel: 'Discard', danger: true });
    if (!ok) return;
    await settled();
    skipRest(); discardWorkout(); closeTop();
  };

  return (
    <Page title={a.name} subtitle={`${fmtDuration((now - a.startedAt) / 1000)} · ${totalDone} ${totalDone === 1 ? 'set' : 'sets'}`}
      onBack={closeTop}
      right={<Btn size="sm" onClick={finish}>Finish</Btn>}
      footer={null}>
      <div class="grid3" style="margin-bottom:14px">
        <div class="stat"><div class="v num">{fmtDuration((now - a.startedAt) / 1000)}</div><div class="l">Duration</div></div>
        <div class="stat"><div class="v num">{fmtNum(dispWeight(vol, u, 0))}</div><div class="l">Volume ({weightUnit(u)})</div></div>
        <div class="stat"><div class="v num">{totalDone}</div><div class="l">Sets done</div></div>
      </div>
      {a.exercises.map((ex) => <ExCard key={ex.key} ex={ex} units={u} records={records} settings={s.settings} />)}
      {!a.exercises.length && <Empty icon={Plus} title="Add your first exercise" text="Pick from 130+ exercises or create your own." />}
      <Btn block size="lg" icon={Plus} variant="secondary" onClick={() => openExercisePicker({ onPick: (ids) => ids.forEach((id) => addExerciseToActive(id)) })}>Add exercise</Btn>
      <input class="input" style="margin-top:12px;font-weight:550;font-size:15px" placeholder="Workout notes…" value={a.notes} onInput={(e) => setActiveMeta({ notes: e.currentTarget.value })} />
      <Btn block variant="ghost" style="margin-top:8px;color:var(--red)" onClick={cancel}>Discard workout</Btn>
      <div style="height:90px" />
      <RestPill />
    </Page>
  );
}

export function WorkoutSummary({ item, prs }) {
  const s = useStore();
  const u = s.profile.units;
  return (
    <Page title="Workout complete" onBack={closeTop}>
      {prs.length > 0 && <Confetti />}
      <div class="stack-lg">
        <div class="center" style="padding-top:8px">
          <div style="font-size:54px">{prs.length ? '🏆' : '💪'}</div>
          <h1 style="font-size:28px;font-weight:800;letter-spacing:-.8px;margin-top:6px">{prs.length ? 'New personal records!' : 'Nice work!'}</h1>
          <div class="muted" style="margin-top:4px">{item.name} · {fmtDayLong(item.date)}</div>
        </div>
        <div class="grid2">
          <div class="stat"><div class="v num">{fmtDurationShort(item.durationSec)}</div><div class="l">Duration</div></div>
          <div class="stat"><div class="v num">{fmtNum(dispWeight(item.volume, u, 0))} <small class="muted" style="font-size:13px">{weightUnit(u)}</small></div><div class="l">Total volume</div></div>
          <div class="stat"><div class="v num">{item.sets}</div><div class="l">Sets</div></div>
          <div class="stat"><div class="v num">{item.exercises.length}</div><div class="l">Exercises</div></div>
        </div>
        {prs.length > 0 && (
          <div class="list">
            {prs.map((p) => (
              <div class="row" key={p.exId}><div class="row-icon" style="color:#ffd34d"><Trophy size={19} /></div>
                <div class="row-main"><div class="row-title">{getExercise(p.exId).name}</div><div class="row-sub">{p.types.map((t) => (t === 'weight' ? `Heaviest ${dispWeight(p.weight, u)} ${weightUnit(u)}` : t === '1rm' ? `Est. 1RM ${dispWeight(p.e1rm, u, 0)} ${weightUnit(u)}` : `${p.reps} reps`)).join(' · ')}</div></div></div>
            ))}
          </div>
        )}
        <Btn block size="lg" onClick={closeTop}>Done</Btn>
      </div>
    </Page>
  );
}
