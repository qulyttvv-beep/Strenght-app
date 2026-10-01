// Sheets used from several tabs.
import { useState, useRef, useEffect } from 'preact/hooks';
import { Sparkles, Send, Trash2 } from 'lucide-preact';
import { Sheet, Btn, Field, Segmented, NumInput, Spinner, cx } from '../ui/kit.jsx';
import { WeightInput } from '../ui/inputs.jsx';
import { closeTop, toast, openSheet, confirmDialog } from '../ui/nav.js';
import { useStore, logWeight, latestWeight, update, getAge, latestBodyFat, isMinor, setAi } from '../lib/store.js';
import { askCoach, resolveProvider } from '../lib/ai.js';
import { today, fmtDayLong, addDays, dispWeight, weightUnit } from '../lib/util.js';

export function LogWeightSheet() {
  const s = useStore();
  const u = s.profile.units;
  const [kg, setKg] = useState(latestWeight(s)?.kg ?? 70);
  const [date, setDate] = useState(today());
  return (
    <Sheet title="Log weight" footer={<Btn block size="lg" disabled={!kg} onClick={() => { logWeight(kg, date); toast('Weight saved', 'good'); closeTop(); }}>Save</Btn>}>
      <div class="stack">
        <WeightInput big kg={kg} units={u} onChange={setKg} autofocus />
        <div class="row-flex gap8">
          {[0, -1, -2].map((n) => <button class={cx('chip', date === addDays(today(), n) && 'on')} onClick={() => setDate(addDays(today(), n))}>{n === 0 ? 'Today' : n === -1 ? 'Yesterday' : fmtDayLong(addDays(today(), n))}</button>)}
        </div>
        <div class="muted small center">Weigh in the morning, after the bathroom, for the cleanest trend.</div>
      </div>
    </Sheet>
  );
}

export function CoachSheet() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef();
  const cfg = resolveProvider(s.settings.ai);
  const age = getAge(s.profile);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [s.chat.length, busy]);
  const ctx = () => {
    const w = latestWeight(s), bf = latestBodyFat(s);
    return `${s.profile.sex}, ${age} years, ${Math.round(s.profile.heightCm)} cm, ${w ? w.kg + ' kg' : 'weight unknown'}${bf ? `, ~${bf.pct}% body fat` : ''}. Goal: ${s.profile.goal}. Trains ${s.profile.daysPerWeek}x/week, ${s.profile.experience}.`;
  };
  const send = async (text) => {
    const question = (text ?? q).trim();
    if (!question || busy) return;
    setQ(''); setBusy(true);
    update('chat', (c) => { c.push({ role: 'user', text: question }); });
    try {
      const answer = await askCoach(s.settings.ai, { question, context: ctx(), history: s.chat, minor: isMinor(age) });
      update('chat', (c) => { c.push({ role: 'ai', text: answer }); });
    } catch (e) {
      update('chat', (c) => { c.push({ role: 'ai', text: `⚠️ ${e.message}` }); });
    } finally { setBusy(false); }
  };
  const ideas = ['How do I break a bench press plateau?', 'How much protein do I really need?', 'Is my training split good?', 'How should I deload?'];
  return (
    <Sheet tall title="AI Coach" right={s.chat.length ? <button class="iconbtn" aria-label="Clear" onClick={() => update('chat', () => [])}><Trash2 size={20} /></button> : undefined}
      footer={
        <div class="row-flex gap8">
          <input class="input" style="height:48px" placeholder="Ask anything about training or food…" value={q} onInput={(e) => setQ(e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button class="iconbtn" style="background:var(--accent);color:var(--accent-ink);width:48px;height:48px" onClick={() => send()} aria-label="Send"><Send size={20} /></button>
        </div>
      }>
      <div class="stack-sm">
        {!s.chat.length && (
          <div class="stack">
            <div class="notice"><Sparkles size={20} /><div>Ask the coach about training, nutrition and recovery. Uses {cfg.name}{cfg.configured ? '' : ' – add a key in Settings → AI'}. Only your question and basic stats are sent.</div></div>
            <div class="chips">{ideas.map((i) => <button class="chip" onClick={() => send(i)}>{i}</button>)}</div>
          </div>
        )}
        {s.chat.map((m, i) => <div key={i} class={cx('msg', m.role === 'user' ? 'u' : 'a')}>{m.text}</div>)}
        {busy && <div class="msg a"><Spinner /></div>}
        <div ref={end} />
      </div>
    </Sheet>
  );
}
