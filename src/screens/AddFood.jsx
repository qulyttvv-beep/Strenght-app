import { useState, useRef, useEffect, useMemo } from 'preact/hooks';
import { Sparkles, Camera, Image as ImageIcon, Search, Clock, PencilLine, Trash2, X, Check, Globe, Barcode, Plus, WifiOff, Zap, Star } from 'lucide-preact';
import { Page, Sheet, Btn, Chip, Field, NumInput, Stepper, Spinner, cx, Card, Empty, Badge } from '../ui/kit.jsx';
import { openPage, openSheet, closeTop, toast, confirmDialog } from '../ui/nav.js';
import { useStore, addFoodEntries, saveCustomFood, deleteCustomFood, setAi, setSettings } from '../lib/store.js';
import { searchFoods, entryFromFood, entryTotals, MEALS, defaultMeal } from '../lib/foods.js';
import { analyzeMeal, resolveProvider } from '../lib/ai.js';
import { searchOpenFoodFacts, lookupBarcode } from '../lib/foodnet.js';
import { fileToAiDataUrl } from '../lib/image.js';
import { uid, round, fmtDayLong } from '../lib/util.js';

export const openAddFood = (props = {}) => openPage(AddFoodPage, props);

const MealChips = ({ meal, onChange }) => (
  <div class="chips fit">{MEALS.map((m) => <Chip key={m.id} on={meal === m.id} onClick={() => onChange(m.id)}>{m.emoji} {m.label}</Chip>)}</div>
);

function MacroPills({ x }) {
  return <div class="pill-macros"><span class="pm p">P {round(x.p)}g</span><span class="pm c">C {round(x.c)}g</span><span class="pm f">F {round(x.f)}g</span></div>;
}

// ---------------------------------------------------------------- page
function AddFoodPage({ date, meal: meal0, tab: tab0 = 'ai' }) {
  const s = useStore();
  const [tab, setTab] = useState(tab0);
  const [meal, setMeal] = useState(meal0 || defaultMeal());
  const [added, setAdded] = useState(0);
  const onAdded = (n = 1) => setAdded((a) => a + n);
  const TABS = [['ai', 'AI', Sparkles], ['search', 'Search', Search], ['recent', 'Recent', Clock], ['custom', 'Quick', Zap]];
  return (
    <Page title="Add food" subtitle={fmtDayLong(date)} right={added ? <Badge tone="good">{added} added</Badge> : null}
      footer={added ? <Btn block size="lg" onClick={closeTop}>Done</Btn> : null}>
      <div class="tabs">{TABS.map(([id, label, I]) => <button key={id} class={tab === id ? 'on' : ''} onClick={() => setTab(id)}><I size={17} />{label}</button>)}</div>
      <div style="margin-bottom:14px"><MealChips meal={meal} onChange={setMeal} /></div>
      {tab === 'ai' && <AiTab date={date} meal={meal} onAdded={onAdded} />}
      {tab === 'search' && <SearchTab date={date} meal={meal} onAdded={onAdded} />}
      {tab === 'recent' && <RecentTab date={date} meal={meal} onAdded={onAdded} />}
      {tab === 'custom' && <QuickTab date={date} meal={meal} onAdded={onAdded} />}
    </Page>
  );
}

// ---------------------------------------------------------------- AI tab
function AiTab({ date, meal, onAdded }) {
  const s = useStore();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [res, setRes] = useState(null);
  const cam = useRef(), gal = useRef();
  const cfg = resolveProvider(s.settings.ai);

  const pick = (e) => {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!f) return;
    setPhoto(f);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  };
  const clearPhoto = () => { setPhoto(null); setPreview(null); };

  const run = async () => {
    if (!text.trim() && !photo) { toast('Describe your meal or add a photo'); return; }
    if (photo && !s.settings.ai.photoConsent) {
      const ok = await confirmDialog({ title: 'Send photo to AI?', message: `Your meal photo will be sent to ${cfg.name} to estimate calories. It's not stored anywhere else and your gallery is never uploaded.`, confirmLabel: 'Send photo' });
      if (!ok) return;
      setAi({ photoConsent: true });
    }
    setBusy(true); setErr(null); setRes(null);
    try {
      const image = photo ? await fileToAiDataUrl(photo) : null;
      const r = await analyzeMeal(s.settings.ai, { text: text.trim(), image, meal });
      if (!r.items.length) setErr(r.notes || 'No food detected. Try describing it in words.');
      else setRes({ ...r, items: r.items.map((i) => ({ ...i, id: uid(), orig: { kcal: i.kcal, p: i.p, c: i.c, f: i.f }, mult: 1 })) });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const setItem = (id, patch) => setRes((r) => ({ ...r, items: r.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const scale = (id, m) => setRes((r) => ({ ...r, items: r.items.map((i) => (i.id === id ? { ...i, mult: m, kcal: Math.round(i.orig.kcal * m), p: round(i.orig.p * m, 1), c: round(i.orig.c * m, 1), f: round(i.orig.f * m, 1) } : i)) }));
  const totals = res ? res.items.reduce((t, i) => ({ kcal: t.kcal + (+i.kcal || 0), p: t.p + (+i.p || 0), c: t.c + (+i.c || 0), f: t.f + (+i.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 }) : null;

  const addAll = () => {
    const entries = res.items.map((i) => ({ id: uid(), meal, name: i.name, unit: i.amount, qty: 1, baseGrams: i.grams, base: { kcal: Math.round(+i.kcal || 0), p: +i.p || 0, c: +i.c || 0, f: +i.f || 0 }, src: 'ai', t: Date.now() }));
    addFoodEntries(date, entries);
    onAdded(entries.length);
    toast(`Added ${entries.length} item${entries.length > 1 ? 's' : ''} to ${MEALS.find((m) => m.id === meal).label}`, 'good');
    setRes(null); setText(''); clearPhoto();
  };

  return (
    <div class="stack">
      {!res && (
        <div class="ai-box stack">
          <div class="row-flex"><Sparkles size={20} class="accent" /><b>Describe or snap your meal</b></div>
          <textarea class="input" rows="3" placeholder="e.g. 2 scrambled eggs, 2 slices of toast with butter and a banana" value={text} onInput={(e) => setText(e.currentTarget.value)} />
          {preview
            ? <div class="photo-drop" style="border-style:solid"><img src={preview} alt="meal" /><button class="iconbtn" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6)" onClick={clearPhoto} aria-label="Remove photo"><X size={20} /></button></div>
            : <div class="grid2"><Btn variant="secondary" icon={Camera} onClick={() => cam.current.click()}>Take photo</Btn><Btn variant="secondary" icon={ImageIcon} onClick={() => gal.current.click()}>Gallery</Btn></div>}
          <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
          <input ref={gal} type="file" accept="image/*" hidden onChange={pick} />
          <Btn block size="lg" icon={Sparkles} loading={busy} onClick={run}>{busy ? 'Analyzing…' : 'Estimate calories'}</Btn>
          <div class="muted tiny center">{cfg.configured ? `Using ${cfg.name} (${cfg.model})` : `Add a ${cfg.name} key in Settings → AI`} · estimates can be off by 20% – always check</div>
        </div>
      )}

      {busy && <div class="stack-sm"><div class="shimmer" style="height:92px" /><div class="shimmer" style="height:92px" /></div>}
      {err && !busy && (
        <div class="notice bad"><WifiOff size={20} /><div><b style="color:var(--text)">Couldn't estimate that</b><br />{err}<div class="small" style="margin-top:6px">You can always use Search or Quick add instead – they work offline.</div></div></div>
      )}

      {res && (
        <>
          <div class="spread"><div><div class="bold" style="font-size:18px">{res.items.length} item{res.items.length > 1 ? 's' : ''} found</div><div class="muted small">Tap any number to correct it</div></div><Btn size="sm" variant="ghost" onClick={() => setRes(null)}>Back</Btn></div>
          {res.notes && <div class="notice"><Sparkles size={20} /><div>{res.notes}</div></div>}
          <div>
            {res.items.map((i) => (
              <div class="res-item" key={i.id}>
                <div class="spread" style="margin-bottom:10px">
                  <div class="grow"><input class="input" style="height:40px;font-size:16px;background:transparent;padding:0" value={i.name} onInput={(e) => setItem(i.id, { name: e.currentTarget.value })} /><div class="muted small">{i.amount}</div></div>
                  <button class="iconbtn" onClick={() => setRes((r) => ({ ...r, items: r.items.filter((x) => x.id !== i.id) }))} aria-label="Remove"><Trash2 size={19} /></button>
                </div>
                <div class="grid3" style="grid-template-columns:repeat(4,1fr);gap:8px">
                  {[['kcal', 'kcal'], ['p', 'protein'], ['c', 'carbs'], ['f', 'fat']].map(([k, l]) => (
                    <div key={k}><label>{l}</label><input class="mini" inputmode="decimal" value={i[k]} onInput={(e) => setItem(i.id, { [k]: e.currentTarget.value.replace(/[^0-9.]/g, '') })} /></div>
                  ))}
                </div>
                <div class="row-flex gap8" style="margin-top:10px">{[0.5, 1, 1.5, 2].map((m) => <button class={cx('chip', i.mult === m && 'on')} style="height:30px;padding:0 11px;font-size:13px" onClick={() => scale(i.id, m)}>{m === 0.5 ? '½' : m}×</button>)}</div>
              </div>
            ))}
          </div>
          <Card class="flat"><div class="spread"><div><div class="muted small">Total</div><div class="bold num" style="font-size:24px">{Math.round(totals.kcal)} kcal</div></div><MacroPills x={totals} /></div></Card>
          <Btn block size="lg" icon={Check} disabled={!res.items.length} onClick={addAll}>Add to {MEALS.find((m) => m.id === meal).label}</Btn>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- search
function SearchTab({ date, meal, onAdded }) {
  const s = useStore();
  const [q, setQ] = useState('');
  const [online, setOnline] = useState({ state: 'idle', items: [] });
  const custom = s.food.custom;
  const local = useMemo(() => (q.trim() ? searchFoods(q, custom, 30) : []), [q, custom.length]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setOnline({ state: 'idle', items: [] }); return; }
    setOnline((o) => ({ ...o, state: 'loading' }));
    const t = setTimeout(async () => {
      try {
        const isCode = /^\d{8,14}$/.test(term);
        const items = isCode ? [await lookupBarcode(term)].filter(Boolean) : await searchOpenFoodFacts(term, 12);
        setOnline({ state: 'done', items });
      } catch { setOnline({ state: 'error', items: [] }); }
    }, 650);
    return () => clearTimeout(t);
  }, [q]);

  const open = (food) => openSheet(FoodDetail, { food, date, meal, onAdded });
  const popular = ['Chicken breast, cooked', 'Egg, whole', 'White rice, cooked', 'Banana', 'Oats, rolled (dry)', 'Greek yogurt, nonfat plain', 'Whey protein powder', 'Peanut butter'];
  return (
    <div class="stack">
      <div class="searchbox"><Search size={19} /><input class="input" placeholder="Search foods or type a barcode…" value={q} onInput={(e) => setQ(e.currentTarget.value)} /></div>
      {!q.trim() && (
        <>
          <div class="muted small bold" style="margin-top:6px">POPULAR</div>
          <div class="chips">{popular.map((p) => <Chip onClick={() => setQ(p.split(',')[0])}>{p.split(',')[0]}</Chip>)}</div>
          <div class="notice"><Globe size={20} /><div>Searches 200+ built-in foods offline, plus millions of packaged products online via Open Food Facts (free, no account).</div></div>
        </>
      )}
      {local.length > 0 && <FoodList foods={local} onPick={open} />}
      {q.trim() && !local.length && online.state !== 'loading' && !online.items.length && <Empty icon={Search} title="Nothing found" text="Try a simpler word, or use Quick add / AI." />}
      {q.trim().length >= 3 && (
        <>
          <div class="spread" style="margin-top:6px"><div class="muted small bold">PACKAGED & ONLINE</div>{online.state === 'loading' && <Spinner />}</div>
          {online.state === 'error' && <div class="muted small row-flex"><WifiOff size={16} /> Offline or service busy – showing built-in foods only.</div>}
          {online.items.length > 0 && <FoodList foods={online.items} onPick={open} />}
        </>
      )}
    </div>
  );
}

function FoodList({ foods, onPick }) {
  return (
    <div class="list">
      {foods.map((f) => (
        <button class="food pressable" style="width:100%;text-align:left" key={f.id} onClick={() => onPick(f)}>
          <div class="grow"><div class="n">{f.name}</div><div class="s">{f.serv[0].label} · {Math.round((f.kcal * f.serv[0].g) / 100)} kcal{f.custom ? ' · custom' : ''}</div></div>
          <Plus size={20} class="accent" />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- food detail sheet
function FoodDetail({ food, date, meal: meal0, onAdded }) {
  const [meal, setMeal] = useState(meal0);
  const [idx, setIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(null);
  const useGrams = idx === -1;
  const serving = useGrams ? { label: `${grams || 100} g`, g: grams || 100 } : food.serv[idx];
  const q = useGrams ? 1 : qty;
  const e = entryFromFood(food, serving, q, meal);
  const t = entryTotals(e);
  const add = () => { addFoodEntries(date, [e]); onAdded?.(1); toast(`Added ${food.name.split(',')[0]}`, 'good'); closeTop(); };
  return (
    <Sheet title={food.name} footer={<Btn block size="lg" onClick={add}>Add · {t.kcal} kcal</Btn>}>
      <div class="stack">
        <div class="center" style="padding:6px 0 2px"><div class="big-num num">{t.kcal}<small>kcal</small></div><div style="display:flex;justify-content:center"><MacroPills x={t} /></div></div>
        <Field label="Serving">
          <div class="chips">
            {food.serv.map((sv, i) => <Chip key={i} on={idx === i} onClick={() => setIdx(i)}>{sv.label}</Chip>)}
            <Chip on={useGrams} onClick={() => { setIdx(-1); setGrams(grams || 100); }}>Custom g</Chip>
          </div>
        </Field>
        {useGrams
          ? <Field label="Amount"><NumInput value={grams} onChange={setGrams} unit="g" decimals={0} placeholder="100" /></Field>
          : <div class="spread"><span class="bold">Servings</span><Stepper value={qty} onChange={setQty} step={0.5} min={0.5} max={50} format={(v) => (v % 1 ? v : v.toFixed(0))} /></div>}
        <MealChips meal={meal} onChange={setMeal} />
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- recent / quick
function RecentTab({ date, meal, onAdded }) {
  const s = useStore();
  const items = s.food.recents;
  if (!items.length) return <Empty icon={Clock} title="No recent foods yet" text="Foods you log will show up here for one-tap re-adding." />;
  const add = (r) => { addFoodEntries(date, [{ id: uid(), meal, name: r.name, unit: r.unit, qty: 1, baseGrams: r.baseGrams, base: r.base, src: r.src, t: Date.now() }]); onAdded(1); toast(`Added ${r.name}`, 'good'); };
  return (
    <div class="list">
      {items.map((r, i) => (
        <button key={i} class="food pressable" style="width:100%;text-align:left" onClick={() => add(r)}>
          <div class="grow"><div class="n">{r.name}</div><div class="s">{r.unit} · P {round(r.base.p)} C {round(r.base.c)} F {round(r.base.f)}</div></div>
          <div class="kc">{r.base.kcal}<small>kcal</small></div>
        </button>
      ))}
    </div>
  );
}

function QuickTab({ date, meal, onAdded }) {
  const s = useStore();
  const [f, setF] = useState({ name: '', kcal: null, p: null, c: null, f: null, serving: '1 serving', grams: null, save: false });
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const kcal = f.kcal ?? Math.round((f.p || 0) * 4 + (f.c || 0) * 4 + (f.f || 0) * 9);
  const add = () => {
    const name = f.name.trim() || 'Quick add';
    const base = { kcal: Math.round(kcal), p: f.p || 0, c: f.c || 0, f: f.f || 0 };
    addFoodEntries(date, [{ id: uid(), meal, name, unit: f.serving || '1 serving', qty: 1, baseGrams: f.grams || null, base, src: 'quick', t: Date.now() }]);
    if (f.save && f.name.trim()) {
      const g = f.grams || 100, k = 100 / g;
      saveCustomFood({ id: 'c-' + uid(), name, kcal: base.kcal * k, p: base.p * k, c: base.c * k, f: base.f * k, serv: [{ label: f.serving || '1 serving', g }, { label: '100 g', g: 100 }], cat: 'custom', custom: true });
    }
    onAdded(1); toast(`Added ${name}`, 'good');
    setF({ name: '', kcal: null, p: null, c: null, f: null, serving: '1 serving', grams: null, save: false });
  };
  return (
    <div class="stack">
      <Field label="Name"><input class="input" placeholder="e.g. Mum's lasagne" value={f.name} onInput={(e) => set({ name: e.currentTarget.value })} /></Field>
      <div class="grid2">
        <Field label="Serving"><input class="input" value={f.serving} onInput={(e) => set({ serving: e.currentTarget.value })} /></Field>
        <Field label="Weight (optional)"><NumInput value={f.grams} onChange={(v) => set({ grams: v })} unit="g" decimals={0} /></Field>
      </div>
      <Field label="Calories" hint={f.kcal == null && (f.p || f.c || f.f) ? `Auto from macros: ${kcal} kcal` : undefined}><NumInput value={f.kcal} onChange={(v) => set({ kcal: v })} unit="kcal" decimals={0} placeholder="0" /></Field>
      <div class="grid3">
        <Field label="Protein"><NumInput value={f.p} onChange={(v) => set({ p: v })} unit="g" /></Field>
        <Field label="Carbs"><NumInput value={f.c} onChange={(v) => set({ c: v })} unit="g" /></Field>
        <Field label="Fat"><NumInput value={f.f} onChange={(v) => set({ f: v })} unit="g" /></Field>
      </div>
      <button class={cx('checkrow', f.save && 'on')} onClick={() => set({ save: !f.save })}><span class="checkbox">{f.save && <Check size={15} strokeWidth={3.2} />}</span><span class="row-main"><span class="row-title">Save to my foods</span><span class="row-sub">Find it later in Search</span></span></button>
      <Btn block size="lg" disabled={!kcal} onClick={add}>Add {kcal ? `${Math.round(kcal)} kcal` : ''}</Btn>
      {s.food.custom.length > 0 && (
        <div style="margin-top:8px"><div class="muted small bold" style="margin-bottom:8px">MY FOODS</div>
          <div class="list">{s.food.custom.map((c) => <div class="food" key={c.id}><div class="grow"><div class="n">{c.name}</div><div class="s">{c.serv[0].label} · {Math.round((c.kcal * c.serv[0].g) / 100)} kcal</div></div><button class="iconbtn" aria-label="Delete" onClick={() => deleteCustomFood(c.id)}><Trash2 size={18} /></button></div>)}</div>
        </div>
      )}
    </div>
  );
}
