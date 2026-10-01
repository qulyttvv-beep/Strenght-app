import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { Camera, Image as ImageIcon, Plus, Columns2, Trash2, ChevronLeft, ChevronRight, Eye, EyeOff, Sparkles, X, MoveHorizontal, Check, Lock } from 'lucide-preact';
import { Page, Sheet, Btn, Chip, Field, Card, Empty, Segmented, cx, Badge } from '../ui/kit.jsx';
import { openPage, openSheet, closeTop, toast, confirmDialog, settled } from '../ui/nav.js';
import { useStore, addPhoto, deletePhoto, updatePhoto, setSettings, getAge, latestWeight, isMinor } from '../lib/store.js';
import { photoGet } from '../lib/db.js';
import { urlFor } from '../lib/image.js';
import { today, addDays, fmtDay, fmtDayLong, fmtMonthYear, daysBetween, fmtWeight, dispWeight, weightUnit, round } from '../lib/util.js';

const POSES = [['front', 'Front'], ['side', 'Side'], ['back', 'Back'], ['other', 'Other']];

/** Loads a photo blob URL lazily from IndexedDB. kind: 't' thumb | 'f' full */
function usePhotoUrl(id, kind = 't') {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    photoGet(id).then((rec) => { if (alive && rec) setUrl(urlFor(kind + id, kind === 't' ? rec.thumb : rec.full)); });
    return () => { alive = false; };
  }, [id, kind]);
  return url;
}
export const Thumb = ({ id, kind = 't', class: c, style }) => { const u = usePhotoUrl(id, kind); return u ? <img src={u} class={c} style={style} alt="" draggable={false} /> : <div class="shimmer" style="width:100%;height:100%;border-radius:0" />; };

export const openAddPhoto = (props = {}) => openSheet(AddPhotoSheet, props);

function AddPhotoSheet({ pose: pose0 = 'front' }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pose, setPose] = useState(pose0);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cam = useRef(), gal = useRef();
  const pick = (e) => {
    const f = e.currentTarget.files?.[0]; e.currentTarget.value = '';
    if (!f) return;
    setFile(f); setPreview((o) => { if (o) URL.revokeObjectURL(o); return URL.createObjectURL(f); });
  };
  const save = async () => {
    setBusy(true);
    try { await addPhoto(file, { date, pose, note: note.trim() }); toast('Photo saved on your phone', 'good'); closeTop(); }
    catch (e) { console.error(e); toast('Could not save photo', 'error'); setBusy(false); }
  };
  return (
    <Sheet title="Add progress photo" footer={<Btn block size="lg" loading={busy} disabled={!file} onClick={save}>Save to gallery</Btn>}>
      <div class="stack">
        {preview ? <div class="photo-drop" style="border-style:solid;background:#000"><img src={preview} style="max-height:340px;width:100%;object-fit:contain" alt="" /></div>
          : <div class="grid2"><Btn variant="secondary" icon={Camera} onClick={() => cam.current.click()}>Take photo</Btn><Btn variant="secondary" icon={ImageIcon} onClick={() => gal.current.click()}>From gallery</Btn></div>}
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
        <input ref={gal} type="file" accept="image/*" hidden onChange={pick} />
        {preview && <Btn variant="ghost" size="sm" onClick={() => { setFile(null); setPreview(null); }}>Choose a different photo</Btn>}
        <Field label="Pose"><div class="chips">{POSES.map(([k, l]) => <Chip key={k} on={pose === k} onClick={() => setPose(k)}>{l}</Chip>)}</div></Field>
        <Field label="Date"><div class="chips">{[0, -1, -2, -7].map((n) => <Chip key={n} on={date === addDays(today(), n)} onClick={() => setDate(addDays(today(), n))}>{n === 0 ? 'Today' : n === -1 ? 'Yesterday' : n === -2 ? '2 days ago' : 'Last week'}</Chip>)}</div></Field>
        <Field label="Note (optional)"><input class="input" placeholder="e.g. Week 8, 3 kg down" value={note} onInput={(e) => setNote(e.currentTarget.value)} /></Field>
        <div class="notice"><Lock size={20} /><div>Photos are stored only on this device (not uploaded anywhere). They're included if you export a backup.</div></div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- viewer
function PhotoViewer({ id }) {
  const s = useStore();
  const list = s.photos;
  const [i, setI] = useState(Math.max(0, list.findIndex((p) => p.id === id)));
  const p = list[i];
  const startX = useRef(null);
  if (!p) return <Page title="Photo"><Empty title="Photo not found" /></Page>;
  const go = (d) => setI((x) => Math.min(list.length - 1, Math.max(0, x + d)));
  const del = async () => {
    const ok = await confirmDialog({ title: 'Delete this photo?', message: 'It will be removed from this device.', confirmLabel: 'Delete', danger: true });
    if (!ok) return; await settled();
    await deletePhoto(p.id);
    if (list.length <= 1) closeTop(); else setI((x) => Math.min(x, list.length - 2));
  };
  return (
    <Page title={fmtDayLong(p.date)} subtitle={`${POSES.find((x) => x[0] === p.pose)?.[1] || ''}${p.weightKg ? ' · ' + fmtWeight(p.weightKg, s.profile.units) : ''}`}
      right={<button class="iconbtn" aria-label="Delete" onClick={del}><Trash2 size={21} /></button>}
      footer={<div class="spread"><button class="iconbtn" disabled={i === 0} onClick={() => go(-1)} style={i === 0 ? 'opacity:.3' : ''} aria-label="Previous"><ChevronLeft size={26} /></button>
        <div class="muted small num">{i + 1} / {list.length}</div>
        <button class="iconbtn" disabled={i === list.length - 1} onClick={() => go(1)} style={i === list.length - 1 ? 'opacity:.3' : ''} aria-label="Next"><ChevronRight size={26} /></button></div>}>
      <div onTouchStart={(e) => { startX.current = e.touches[0].clientX; }} onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - startX.current; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); }}>
        <div style="border-radius:22px;overflow:hidden;background:#000"><FullPhoto id={p.id} /></div>
        {p.note && <div class="notice" style="margin-top:14px"><div>“{p.note}”</div></div>}
      </div>
    </Page>
  );
}
function FullPhoto({ id }) { const u = usePhotoUrl(id, 'f'); return u ? <img src={u} style="width:100%;display:block" alt="" /> : <div class="shimmer" style="aspect-ratio:3/4" />; }

// ---------------------------------------------------------------- compare
export const openCompare = (a, b) => openPage(ComparePage, { a, b });
function ComparePage({ a: a0, b: b0 }) {
  const s = useStore();
  const photos = s.photos;
  const sorted = useMemo(() => [...photos].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.addedAt - y.addedAt)), [photos]);
  const [aId, setA] = useState(a0 || sorted[0]?.id);
  const [bId, setB] = useState(b0 || sorted[sorted.length - 1]?.id);
  const [mode, setMode] = useState('slide');
  const [pos, setPos] = useState(50);
  const box = useRef();
  const A = photos.find((p) => p.id === aId), B = photos.find((p) => p.id === bId);
  const move = (e) => { const r = box.current.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))); };
  if (sorted.length < 2) return <Page title="Compare"><Empty icon={Columns2} title="Add at least two photos" text="Take a photo now and another in a few weeks to see your transformation." /></Page>;
  const days = A && B ? Math.abs(daysBetween(A.date, B.date)) : 0;
  const dw = A?.weightKg && B?.weightKg ? B.weightKg - A.weightKg : null;
  const ua = usePhotoUrl(aId, 'f'), ub = usePhotoUrl(bId, 'f');
  const Strip = ({ sel, onPick }) => (
    <div class="chips scroll" style="gap:6px;margin-bottom:10px">{sorted.map((p) => (
      <button key={p.id} onClick={() => onPick(p.id)} style={`width:58px;height:76px;border-radius:12px;overflow:hidden;flex:none;border:2.5px solid ${sel === p.id ? 'var(--accent)' : 'transparent'};opacity:${sel === p.id ? 1 : .6}`}><Thumb id={p.id} style="width:100%;height:100%;object-fit:cover" /></button>
    ))}</div>
  );
  return (
    <Page title="Compare" subtitle={`${days} days apart${dw != null ? ` · ${dw > 0 ? '+' : ''}${round(s.profile.units === 'imperial' ? dw * 2.2046 : dw, 1)} ${weightUnit(s.profile.units)}` : ''}`}>
      <div class="stack">
        <Segmented size="sm" value={mode} onChange={setMode} options={[{ id: 'slide', label: 'Slider' }, { id: 'side', label: 'Side by side' }]} />
        {mode === 'slide' ? (
          <div class="compare" ref={box} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }} onPointerMove={(e) => e.buttons && move(e)}>
            {ub && <img src={ub} alt="" />}
            {ua && <img src={ua} alt="" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
            <div class="handle" style={{ left: `${pos}%` }}><i><MoveHorizontal size={20} /></i></div>
            <div class="tag" style="left:10px">{A ? fmtDay(A.date) : ''}</div><div class="tag" style="right:10px">{B ? fmtDay(B.date) : ''}</div>
          </div>
        ) : (
          <div class="grid2">{[A, B].map((p, i) => <div key={i}><div style="aspect-ratio:3/4;border-radius:18px;overflow:hidden;background:#000">{p && <Thumb id={p.id} kind="f" style="width:100%;height:100%;object-fit:cover" />}</div><div class="center small bold" style="margin-top:6px">{p ? fmtDay(p.date) : ''}</div></div>)}</div>
        )}
        <div><div class="muted small bold" style="margin-bottom:8px">BEFORE (LEFT)</div><Strip sel={aId} onPick={setA} /></div>
        <div><div class="muted small bold" style="margin-bottom:8px">AFTER (RIGHT)</div><Strip sel={bId} onPick={setB} /></div>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- tab section
export function GalleryView() {
  const s = useStore();
  const photos = s.photos;
  const blur = s.settings.photoBlur;
  const [filter, setFilter] = useState('all');
  const shown = photos.filter((p) => filter === 'all' || p.pose === filter);
  return (
    <div class="stack">
      <div class="grid2">
        <Btn icon={Camera} onClick={() => openAddPhoto()}>Add photo</Btn>
        <Btn variant="secondary" icon={Columns2} onClick={() => openCompare()}>Compare</Btn>
      </div>
      {photos.length > 0 && (
        <div class="spread">
          <div class="chips scroll" style="margin:0;padding:0"><Chip on={filter === 'all'} onClick={() => setFilter('all')}>All · {photos.length}</Chip>{POSES.map(([k, l]) => <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}</div>
          <button class={cx('iconbtn', blur && 'active')} aria-label="Privacy blur" onClick={() => setSettings({ photoBlur: !blur })}>{blur ? <EyeOff size={21} /> : <Eye size={21} />}</button>
        </div>
      )}
      {!photos.length && <Card><Empty icon={Camera} title="Your transformation gallery" text="Take front / side / back photos every few weeks. Everything stays on your phone, and you can compare any two with a slider." action={<Btn onClick={() => openAddPhoto()} icon={Plus}>Add first photo</Btn>} /></Card>}
      <div>
        {(() => {
          const groups = []; let cur = null;
          for (const p of shown) { const m = fmtMonthYear(p.date); if (!cur || cur.m !== m) { cur = { m, items: [] }; groups.push(cur); } cur.items.push(p); }
          return groups.map((g) => (
            <div key={g.m}><div class="month-label">{g.m}</div>
              <div class="photo-grid">{g.items.map((p) => (
                <button class="ph" key={p.id} onClick={() => openPage(PhotoViewer, { id: p.id })}><Thumb id={p.id} style={blur ? 'filter:blur(14px)' : ''} /><span>{fmtDay(p.date)} · {POSES.find((x) => x[0] === p.pose)?.[1]}</span></button>
              ))}</div></div>
          ));
        })()}
      </div>
    </div>
  );
}
