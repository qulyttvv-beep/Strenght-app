import { useState } from 'preact/hooks';
import { Plus, Droplets, Copy, Sparkles, Trash2, Flame, Minus } from 'lucide-preact';
import { Card, Btn, Section, Progress as Bar, Sheet, Stepper, Chip, cx, Empty } from '../ui/kit.jsx';
import { Ring, BarChart } from '../ui/charts.jsx';
import { openSheet, closeTop, toast } from '../ui/nav.js';
import { useStore, currentTargets, removeFoodEntry, updateFoodEntry, addWater, copyDay } from '../lib/store.js';
import { dayTotals, foodTotals, lastNDaysCalories } from '../lib/selectors.js';
import { entryTotals, MEALS } from '../lib/foods.js';
import { today, addDays, dowShort, parseDay, fmtDayLong, round, lastNDays, dowLetter } from '../lib/util.js';
import { openAddFood } from './AddFood.jsx';

let selectedDate = null;

function EntrySheet({ date, id }) {
  const s = useStore();
  const e = (s.food.logs[date] || []).find((x) => x.id === id);
  if (!e) return null;
  const t = entryTotals(e);
  return (
    <Sheet title={e.name}
      footer={<div class="grid2"><Btn variant="danger" icon={Trash2} onClick={() => { removeFoodEntry(date, id); closeTop(); toast('Removed'); }}>Delete</Btn><Btn onClick={closeTop}>Done</Btn></div>}>
      <div class="stack">
        <div class="center"><div class="big-num num">{t.kcal}<small>kcal</small></div><div class="pill-macros" style="justify-content:center"><span class="pm p">P {round(t.p)}g</span><span class="pm c">C {round(t.c)}g</span><span class="pm f">F {round(t.f)}g</span></div></div>
        <div class="spread"><span class="bold">Servings <span class="muted small">({e.unit})</span></span><Stepper value={e.qty} step={0.25} min={0.25} max={50} onChange={(v) => updateFoodEntry(date, id, { qty: v })} format={(v) => round(v, 2)} /></div>
        <div class="chips fit">{MEALS.map((m) => <Chip key={m.id} on={e.meal === m.id} onClick={() => updateFoodEntry(date, id, { meal: m.id })}>{m.emoji} {m.label}</Chip>)}</div>
      </div>
    </Sheet>
  );
}

export function Eat() {
  const s = useStore();
  const [date, setDateState] = useState(selectedDate || today());
  const setDate = (d) => { selectedDate = d; setDateState(d); };
  const t = currentTargets(s);
  const entries = s.food.logs[date] || [];
  const tot = foodTotals(entries);
  const days = lastNDays(7);
  const water = s.food.water[date] || 0;
  const prev = addDays(date, -1);
  const week = lastNDaysCalories(s, 7);
  const avg = Math.round(week.filter((x) => x.kcal).reduce((a, x, _, arr) => a + x.kcal / arr.length, 0));

  return (
    <>
      <div class="screen-head"><div><div class="sub">{fmtDayLong(date)}</div><h1>Nutrition</h1></div>
        <Btn size="sm" icon={Sparkles} onClick={() => openAddFood({ date, tab: 'ai' })}>AI log</Btn></div>

      <div class="datebar">
        {days.map((d) => (
          <button key={d} class={cx('dchip', d === date && 'on', (s.food.logs[d] || []).length && 'dot')} onClick={() => setDate(d)}>
            {dowShort(d)}<b>{parseDay(d).getDate()}</b>
          </button>
        ))}
      </div>

      <div class="hero">
        <div class="row-flex" style="gap:18px">
          <Ring value={tot.kcal} max={t.kcal} size={132} stroke={13}>
            <div class="big num" style="font-size:30px">{Math.abs(t.kcal - tot.kcal).toLocaleString()}</div>
            <div class="lbl">{t.kcal - tot.kcal >= 0 ? 'left' : 'over'}</div>
          </Ring>
          <div class="grow stack-sm">
            <div class="macro"><div class="top"><span>Protein</span><b>{tot.p}/{t.protein}g</b></div><Bar value={tot.p} max={t.protein} color="var(--p)" height={7} /></div>
            <div class="macro"><div class="top"><span>Carbs</span><b>{tot.c}/{t.carbs}g</b></div><Bar value={tot.c} max={t.carbs} color="var(--c)" height={7} /></div>
            <div class="macro"><div class="top"><span>Fat</span><b>{tot.f}/{t.fat}g</b></div><Bar value={tot.f} max={t.fat} color="var(--f)" height={7} /></div>
          </div>
        </div>
        <div class="muted small" style="margin-top:12px"><b style="color:var(--text)" class="num">{tot.kcal.toLocaleString()}</b> of {t.kcal.toLocaleString()} kcal{t.custom ? ' (custom goal)' : ''}</div>
      </div>

      {MEALS.map((m) => {
        const list = entries.filter((e) => e.meal === m.id);
        const mk = foodTotals(list).kcal;
        return (
          <div class="meal" key={m.id}>
            <div class="meal-head"><div class="t"><span>{m.emoji}</span>{m.label}</div><div class="k">{mk ? `${mk} kcal` : ''}</div></div>
            <div class="list">
              {list.map((e) => {
                const x = entryTotals(e);
                return (
                  <button class="food pressable" style="width:100%;text-align:left" key={e.id} onClick={() => openSheet(EntrySheet, { date, id: e.id })}>
                    <div class="grow"><div class="n">{e.name}{e.src === 'ai' && <span class="accent" style="margin-left:6px;font-size:11px">✦ AI</span>}</div><div class="s">{e.qty !== 1 ? `${round(e.qty, 2)} × ` : ''}{e.unit} · P {round(x.p)} · C {round(x.c)} · F {round(x.f)}</div></div>
                    <div class="kc">{x.kcal}<small>kcal</small></div>
                  </button>
                );
              })}
              <button class="addrow" onClick={() => openAddFood({ date, meal: m.id, tab: 'search' })}><Plus size={19} />Add food</button>
            </div>
          </div>
        );
      })}

      {!entries.length && (
        <Card class="flat" style="margin-top:16px" onClick={() => { copyDay(prev, date); toast('Copied yesterday'); }}>
          <div class="row-flex"><Copy size={20} class="accent" /><div class="grow"><div class="bold">Copy yesterday's meals</div><div class="muted small">{(s.food.logs[prev] || []).length ? `${(s.food.logs[prev] || []).length} items` : 'Nothing logged yesterday'}</div></div></div>
        </Card>
      )}

      <Section title="Water">
        <Card>
          <div class="spread"><div><div class="big-num" style="font-size:30px">{round(water / 1000, 2)}<small>/ {round(t.water / 1000, 1)} L</small></div></div>
            <div class="row-flex"><button class="iconbtn" style="background:var(--card3)" onClick={() => addWater(date, -250)} aria-label="Less"><Minus size={20} /></button><Btn size="sm" icon={Droplets} onClick={() => addWater(date, 250)}>250 ml</Btn></div></div>
          <div style="margin-top:12px"><Bar value={water} max={t.water} color="var(--blue)" height={9} /></div>
        </Card>
      </Section>

      <Section title="Last 7 days" sub={avg ? `Average ${avg.toLocaleString()} kcal` : undefined}>
        <Card><BarChart bars={week.map((x) => ({ label: dowLetter(x.d), value: x.kcal, today: x.d === today(), color: x.kcal > t.kcal * 1.1 ? 'var(--red)' : 'var(--accent)' }))} goal={t.kcal} /></Card>
      </Section>
    </>
  );
}
