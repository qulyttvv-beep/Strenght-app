import { useState, useRef } from 'preact/hooks';
import { User, Target, Sparkles, Palette, Database, Download, Upload, Trash2, Shield, Info, ChevronRight, KeyRound, Check, ExternalLink, RefreshCw, Zap, Bell, Vibrate, Timer, Heart, Eye, EyeOff, TriangleAlert, Flame, Scale } from 'lucide-preact';
import { Card, Btn, Section, Row, Sheet, Toggle, Field, Segmented, NumInput, Chip, cx, Badge, Spinner, Page } from '../ui/kit.jsx';
import { HeightInput, WeightInput } from '../ui/inputs.jsx';
import { openSheet, openPage, closeTop, toast, confirmDialog, settled } from '../ui/nav.js';
import { useStore, setProfile, setSettings, setAi, currentTargets, getAge, isMinor, latestWeight, wipeAll } from '../lib/store.js';
import { ACTIVITY, GOALS, PACE_OPTIONS, defaultPace, ageFromBirthdate, MIN_AGE } from '../lib/calc.js';
import { PROVIDERS, resolveProvider, testAi, listModels } from '../lib/ai.js';
import { shareBackup, restoreFromFile } from '../lib/backup.js';
import { isNative } from '../lib/net.js';
import { fmtHeight, round, weightUnit, dispWeight } from '../lib/util.js';

const ACCENTS = [['volt', '#c6ff3d'], ['blue', '#5ab0ff'], ['orange', '#ff8f3d'], ['pink', '#ff6fae'], ['violet', '#a78bfa'], ['mint', '#34e3b0']];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR = new Date().getFullYear();

// ---------------------------------------------------------------- edit profile
function EditProfileSheet() {
  const s = useStore();
  const p = s.profile;
  const [d, setD] = useState({ name: p.name, sex: p.sex, units: p.units, heightCm: p.heightCm, goal: p.goal, activity: p.activity, rate: p.rateKgPerWeek, goalWeightKg: p.goalWeightKg });
  const [dob, setDob] = useState(() => { const [y, m, dd] = (p.birthdate || '').split('-'); return { y: y || '', m: m ? String(+m - 1) : '', d: dd ? String(+dd) : '' }; });
  const set = (x) => setD((o) => ({ ...o, ...x }));
  const iso = dob.y && dob.m !== '' && dob.d ? `${dob.y}-${String(+dob.m + 1).padStart(2, '0')}-${String(dob.d).padStart(2, '0')}` : null;
  const age = iso ? ageFromBirthdate(iso) : null;
  const tooYoung = age != null && age < MIN_AGE;
  const save = () => {
    if (tooYoung) return;
    setProfile({ name: d.name.trim(), sex: d.sex, units: d.units, heightCm: d.heightCm, goal: d.goal, activity: d.activity, rateKgPerWeek: d.rate, goalWeightKg: d.goalWeightKg, birthdate: iso || p.birthdate, customTargets: p.customTargets });
    toast('Profile updated', 'good'); closeTop();
  };
  return (
    <Sheet tall title="Edit profile" footer={<Btn block size="lg" disabled={tooYoung || !d.heightCm} onClick={save}>Save</Btn>}>
      <div class="stack">
        <Field label="Name"><input class="input" value={d.name} onInput={(e) => set({ name: e.currentTarget.value.slice(0, 24) })} /></Field>
        <Field label="Date of birth">
          <div class="dob">
            <select class="input" value={dob.d} onChange={(e) => setDob({ ...dob, d: e.currentTarget.value })}><option value="">Day</option>{Array.from({ length: 31 }, (_, i) => <option value={i + 1}>{i + 1}</option>)}</select>
            <select class="input" value={dob.m} onChange={(e) => setDob({ ...dob, m: e.currentTarget.value })}><option value="">Month</option>{MONTHS.map((m, i) => <option value={i}>{m}</option>)}</select>
            <select class="input" value={dob.y} onChange={(e) => setDob({ ...dob, y: e.currentTarget.value })}><option value="">Year</option>{Array.from({ length: 95 }, (_, i) => YEAR - i).map((y) => <option value={y}>{y}</option>)}</select>
          </div>
          {tooYoung && <div class="notice bad" style="margin-top:10px"><TriangleAlert size={20} /><div>Forma is for ages {MIN_AGE}+.</div></div>}
        </Field>
        <Field label="Sex"><Segmented options={[{ id: 'male', label: 'Male' }, { id: 'female', label: 'Female' }]} value={d.sex} onChange={(v) => set({ sex: v })} /></Field>
        <Field label="Units"><Segmented options={[{ id: 'metric', label: 'kg · cm' }, { id: 'imperial', label: 'lb · ft/in' }]} value={d.units} onChange={(v) => set({ units: v })} /></Field>
        <HeightInput cm={d.heightCm} units={d.units} onChange={(v) => set({ heightCm: v })} />
        <Field label="Goal"><div class="chips">{GOALS.map((g) => <Chip key={g.id} on={d.goal === g.id} onClick={() => set({ goal: g.id, rate: defaultPace(g.id) })}>{g.emoji} {g.label}</Chip>)}</div></Field>
        {(d.goal === 'lose' || d.goal === 'gain') && !isMinor(age ?? getAge(p)) && <Field label="Pace"><Segmented value={String(d.rate)} onChange={(v) => set({ rate: +v })} options={(PACE_OPTIONS[d.goal] || PACE_OPTIONS.lose).map((r) => ({ id: String(r), label: `${round(d.units === 'imperial' ? r * 2.2046 : r, 2)} ${weightUnit(d.units)}/wk` }))} /></Field>}
        <Field label="Activity level"><div class="stack-sm">{ACTIVITY.map((a) => <button key={a.id} class={cx('checkrow', d.activity === a.id && 'on')} onClick={() => set({ activity: a.id })}><span class="checkbox">{d.activity === a.id && <Check size={15} strokeWidth={3.2} />}</span><span class="row-main"><span class="row-title">{a.label}</span><span class="row-sub">{a.hint}</span></span></button>)}</div></Field>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- targets
function TargetsSheet() {
  const s = useStore();
  const auto = currentTargets({ ...s, profile: { ...s.profile, customTargets: null } });
  const cur = currentTargets(s);
  const [t, setT] = useState({ kcal: cur.kcal, protein: cur.protein, carbs: cur.carbs, fat: cur.fat, water: cur.water });
  const set = (x) => setT((o) => ({ ...o, ...x }));
  const kcalFromMacros = Math.round(t.protein * 4 + t.carbs * 4 + t.fat * 9);
  return (
    <Sheet tall title="Daily targets" footer={<div class="grid2"><Btn variant="secondary" onClick={() => { setProfile({ customTargets: null }); toast('Back to automatic'); closeTop(); }}>Use auto</Btn><Btn onClick={() => { setProfile({ customTargets: t }); toast('Targets saved', 'good'); closeTop(); }}>Save</Btn></div>}>
      <div class="stack">
        <div class="notice"><Info size={20} /><div>Automatic: <b style="color:var(--text)">{auto.kcal} kcal</b> (maintenance ≈ {auto.maintenance}). Your macros add up to {kcalFromMacros} kcal.</div></div>
        <Field label="Calories"><NumInput value={t.kcal} decimals={0} unit="kcal" onChange={(v) => set({ kcal: v || 0 })} /></Field>
        <div class="grid3">
          <Field label="Protein"><NumInput value={t.protein} decimals={0} unit="g" onChange={(v) => set({ protein: v || 0 })} /></Field>
          <Field label="Carbs"><NumInput value={t.carbs} decimals={0} unit="g" onChange={(v) => set({ carbs: v || 0 })} /></Field>
          <Field label="Fat"><NumInput value={t.fat} decimals={0} unit="g" onChange={(v) => set({ fat: v || 0 })} /></Field>
        </div>
        <Field label="Water"><NumInput value={t.water} decimals={0} unit="ml" onChange={(v) => set({ water: v || 0 })} /></Field>
        {isMinor(getAge(s.profile)) && <div class="notice warn"><TriangleAlert size={20} /><div>At your age, big calorie cuts aren't recommended. Talk to a parent or doctor before going below the suggested target.</div></div>}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- AI settings
function AiSettingsPage() {
  const s = useStore();
  const ai = s.settings.ai;
  const cfg = resolveProvider(ai);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [models, setModels] = useState([]);
  const sel = ai.provider || 'auto';
  const P = PROVIDERS[sel] || null;
  // In automatic mode always show the recommended provider's key field, so there is an obvious place to paste a key.
  const active = P || PROVIDERS.gemini;
  const id = active.id;
  const key = ai.keys?.[id] || '';

  const test = async () => {
    setBusy('test'); setResult(null);
    try { const r = await testAi(ai); setResult({ ok: true, msg: `Connected to ${r.provider} (${r.model}) in ${r.ms} ms` }); }
    catch (e) { setResult({ ok: false, msg: e.message }); } finally { setBusy(null); }
  };
  const fetchModels = async () => {
    setBusy('models');
    try { const m = await listModels(ai, id); setModels(m); if (!m.length) toast('No models returned'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  return (
    <Page title="AI & privacy">
      <div class="stack-lg">
        <div class="notice"><Shield size={20} /><div><b style="color:var(--text)">AI is optional and free.</b> Nothing is sent unless you tap an AI button. Your meal text/photo, or a workout request, goes straight from your phone to the provider you choose – never through a Forma server (there isn't one).</div></div>

        <Section title="Provider">
          <div class="stack-sm">
            <button class={cx('checkrow', sel === 'auto' && 'on')} onClick={() => setAi({ provider: 'auto' })}><span class="checkbox">{sel === 'auto' && <Check size={15} strokeWidth={3.2} />}</span><span class="row-main"><span class="row-title">Automatic</span><span class="row-sub">Uses whichever you've added a key for (Gemini → Groq → OpenRouter), else the keyless service. Currently: {cfg.name}</span></span></button>
            {Object.values(PROVIDERS).map((pr) => (
              <button key={pr.id} class={cx('checkrow', sel === pr.id && 'on')} onClick={() => setAi({ provider: pr.id })}>
                <span class="checkbox">{sel === pr.id && <Check size={15} strokeWidth={3.2} />}</span>
                <span class="row-main"><span class="row-title">{pr.name} {ai.keys?.[pr.id] && <Badge tone="good">key added</Badge>}</span><span class="row-sub">{pr.blurb}</span></span>
              </button>
            ))}
          </div>
        </Section>

        <Section title={`${active.name} settings`}>
          <Card><div class="stack">
            {active.needsKey && (
              <Field label="API key" right={<a class="link" href={active.keyUrl} target="_blank" rel="noopener" style="font-size:12.5px">Get a free key <ExternalLink size={12} style="vertical-align:-1px" /></a>}>
                <div class="row-flex"><input class="input" type={show ? 'text' : 'password'} autocomplete="off" autocapitalize="off" spellcheck={false} placeholder="Paste your key" value={key} onInput={(e) => setAi({ keys: { ...ai.keys, [id]: e.currentTarget.value.trim() } })} />
                  <button class="iconbtn" style="background:var(--card2)" onClick={() => setShow(!show)} aria-label="Show key">{show ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
              </Field>
            )}
            {id === 'custom' && <><Field label="Base URL" hint="e.g. https://api.together.xyz/v1 or http://192.168.1.20:11434/v1"><input class="input" placeholder="https://…/v1" value={ai.customBase || ''} onInput={(e) => setAi({ customBase: e.currentTarget.value })} /></Field><Field label="API key (if needed)"><input class="input" type="password" value={key} onInput={(e) => setAi({ keys: { ...ai.keys, custom: e.currentTarget.value.trim() } })} /></Field></>}
            <Field label="Model" hint="Leave blank for the recommended default. Free models change over time – use “Find models” if one stops working.">
              <input class="input" placeholder={active.models[0] || 'model id'} value={ai.models?.[id] || ''} onInput={(e) => setAi({ models: { ...ai.models, [id]: e.currentTarget.value.trim() } })} />
            </Field>
            {models.length > 0 && <div class="chips" style="max-height:140px;overflow:auto">{models.slice(0, 60).map((m) => <Chip key={m} on={ai.models?.[id] === m} onClick={() => setAi({ models: { ...ai.models, [id]: m } })}>{m}</Chip>)}</div>}
            <div class="grid2"><Btn variant="secondary" icon={RefreshCw} loading={busy === 'models'} onClick={fetchModels}>Find models</Btn><Btn icon={Zap} loading={busy === 'test'} onClick={test}>Test</Btn></div>
            {result && <div class={cx('notice', !result.ok && 'bad')}>{result.ok ? <Check size={20} /> : <TriangleAlert size={20} />}<div>{result.msg}</div></div>}
          </div></Card>
        </Section>

        <Section title="Photos">
          <Card><div class="spread"><div class="grow"><div class="bold">Allow sending photos to AI</div><div class="muted small">Only for meal analysis / physique check, one photo at a time. Off = you'll be asked each time.</div></div><Toggle on={!!ai.photoConsent} onChange={(v) => setAi({ photoConsent: v })} /></div></Card>
        </Section>
        <div class="muted small center">Free tiers have daily limits and providers can change them. The app keeps working without AI – food search, quick add, the offline workout generator and every body tool run on-device.</div>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- main
export function Profile() {
  const s = useStore();
  const p = s.profile;
  const age = getAge(p);
  const t = currentTargets(s);
  const cfg = resolveProvider(s.settings.ai);
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const w = latestWeight(s);
  const goal = GOALS.find((g) => g.id === p.goal);

  const doExport = async () => { setBusy(true); try { await shareBackup(); toast(isNative() ? 'Backup ready to share' : 'Backup downloaded', 'good'); } catch (e) { toast('Export failed: ' + (e.message || e), 'error'); } finally { setBusy(false); } };
  const doImport = async (e) => {
    const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!f) return;
    const ok = await confirmDialog({ title: 'Restore this backup?', message: 'This replaces all data currently on this phone.', confirmLabel: 'Restore', danger: true });
    if (!ok) return; await settled();
    try { await restoreFromFile(f); toast('Backup restored', 'good'); } catch (err) { toast(err.message, 'error'); }
  };
  const wipe = async () => {
    const ok = await confirmDialog({ title: 'Delete everything?', message: 'All workouts, food logs, photos and settings on this phone will be erased. This cannot be undone.', confirmLabel: 'Delete all', danger: true });
    if (!ok) return; await settled();
    await wipeAll(); toast('All data deleted');
  };

  return (
    <>
      <div class="screen-head"><div><div class="sub">Settings</div><h1>You</h1></div></div>
      <Card class="hero" onClick={() => openSheet(EditProfileSheet)}>
        <div class="row-flex" style="gap:14px;position:relative;z-index:1">
          <div style="width:58px;height:58px;border-radius:20px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-size:24px;font-weight:800">{(p.name || 'F')[0].toUpperCase()}</div>
          <div class="grow"><div class="bold" style="font-size:19px">{p.name || 'Athlete'}</div><div class="muted small">{age} yrs · {fmtHeight(p.heightCm, p.units)} · {w ? `${dispWeight(w.kg, p.units)} ${weightUnit(p.units)}` : ''}</div><div class="small" style="margin-top:3px">{goal?.emoji} {goal?.label}</div></div>
          <ChevronRight class="muted" />
        </div>
      </Card>

      <Section title="Nutrition">
        <div class="list">
          <Row icon={Flame} title="Daily targets" sub={`${t.kcal} kcal · P ${t.protein} · C ${t.carbs} · F ${t.fat}${t.custom ? ' (custom)' : ''}`} onClick={() => openSheet(TargetsSheet)} />
        </div>
      </Section>

      <Section title="AI">
        <div class="list"><Row icon={Sparkles} title="AI & privacy" sub={cfg.configured ? `${cfg.name}${cfg.needsKey ? ' · key added' : ''}` : 'Not set up – add a free key'} onClick={() => openPage(AiSettingsPage)} right={!cfg.configured ? <Badge tone="warn">Setup</Badge> : null} /></div>
      </Section>

      <Section title="Training">
        <div class="list">
          <Row icon={Timer} title="Rest timer" sub="Default rest between sets" right={<span class="muted bold">{s.settings.restSec}s</span>} onClick={() => setSettings({ restSec: s.settings.restSec >= 180 ? 45 : s.settings.restSec + 15 })} chevron={false} />
          <Row icon={Bell} title="Auto-start rest timer" right={<Toggle on={s.settings.autoRest} onChange={(v) => setSettings({ autoRest: v })} />} chevron={false} />
          <Row icon={Vibrate} title="Haptics & vibration" right={<Toggle on={s.settings.haptics} onChange={(v) => setSettings({ haptics: v })} />} chevron={false} />
        </div>
      </Section>

      <Section title="Appearance">
        <Card><div class="muted small bold" style="margin-bottom:12px">ACCENT COLOUR</div>
          <div class="row-flex" style="justify-content:space-between">{ACCENTS.map(([k, c]) => <button key={k} aria-label={k} onClick={() => setSettings({ accent: k })} style={`width:44px;height:44px;border-radius:50%;background:${c};box-shadow:${s.settings.accent === k ? `0 0 0 3px var(--bg),0 0 0 5px ${c}` : 'none'};transition:box-shadow .2s`} />)}</div></Card>
      </Section>

      <Section title="Your data" sub="Everything lives on this phone. Back it up before switching phones or uninstalling.">
        <div class="list">
          <Row icon={Download} title="Export backup" sub="Workouts, food, photos & settings (.json)" onClick={doExport} right={busy ? <Spinner /> : null} />
          <Row icon={Upload} title="Restore from backup" onClick={() => fileRef.current.click()} />
          <Row icon={Trash2} title="Delete all data" danger onClick={wipe} />
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
      </Section>

      <Section title="About">
        <div class="stack-sm">
          <div class="notice"><Shield size={20} /><div>Forma is for ages {MIN_AGE}+. It gives general fitness information – not medical advice. Talk to a doctor before starting a new diet or training plan, especially if you have a health condition.</div></div>
          <div class="muted tiny center" style="padding:8px">Forma 1.0 · private by design · food data: built-in database & Open Food Facts (ODbL)</div>
        </div>
      </Section>
    </>
  );
}
