import { useEffect } from 'preact/hooks';
import { House, Dumbbell, Utensils, TrendingUp, User, Timer } from 'lucide-preact';
import { useStore, isReady } from './lib/store.js';
import { useUi, setTab, closeTop, openPage } from './ui/nav.js';
import { cx } from './ui/kit.jsx';
import { useRest } from './lib/rest.js';
import { fmtDuration } from './lib/util.js';
import { Onboarding } from './screens/Onboarding.jsx';
import { Home } from './screens/Home.jsx';
import { Train } from './screens/Train.jsx';
import { Eat } from './screens/Eat.jsx';
import { Progress } from './screens/Progress.jsx';
import { Profile } from './screens/Profile.jsx';
import { WorkoutPage } from './screens/Workout.jsx';
import { useNow } from './ui/hooks.js';

const TABS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'train', label: 'Train', icon: Dumbbell },
  { id: 'eat', label: 'Eat', icon: Utensils },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'you', label: 'You', icon: User },
];
const SCREENS = { home: Home, train: Train, eat: Eat, progress: Progress, you: Profile };

function OverlayHost() {
  const { stack } = useUi();
  return (
    <div class="overlay-host">
      {stack.map((e, i) => {
        const z = { zIndex: 10 + i };
        if (e.kind === 'dialog') {
          const p = e.props;
          return (
            <div class={cx('dialog-wrap', e.closing && 'closing')} key={e.key} style={z}>
              <div class="backdrop" onClick={() => e.resolve(false)} />
              <div class="dialog" role="dialog">
                <h3>{p.title}</h3>
                {p.message && <p>{p.message}</p>}
                <div class="grid2">
                  <button class="btn btn-secondary btn-md" onClick={() => e.resolve(false)}>{p.cancelLabel}</button>
                  <button class={cx('btn btn-md', p.danger ? 'btn-danger' : 'btn-primary')} onClick={() => e.resolve(true)}>{p.confirmLabel}</button>
                </div>
              </div>
            </div>
          );
        }
        const C = e.Comp;
        if (e.kind === 'sheet') {
          return (
            <div class={cx('sheet-wrap', e.closing && 'closing')} key={e.key} style={z}>
              <div class="backdrop" onClick={closeTop} />
              <C {...e.props} />
            </div>
          );
        }
        return <div class={cx('ov', e.closing && 'closing')} key={e.key} style={z}><C {...e.props} /></div>;
      })}
    </div>
  );
}

function MiniWorkoutBar() {
  const s = useStore();
  const now = useNow(1000, !!s.active);
  const rest = useRest();
  if (!s.active) return null;
  return (
    <button class="mini-bar" onClick={() => openPage(WorkoutPage)}>
      <Dumbbell size={20} />
      <span>{s.active.name}</span>
      {rest.active && !rest.done && <span class="row-flex" style="gap:4px"><Timer size={16} />{rest.left}s</span>}
      <span class="tm">{fmtDuration((now - s.active.startedAt) / 1000)}</span>
    </button>
  );
}

export function App() {
  const s = useStore();
  const ui = useUi();
  useEffect(() => { document.documentElement.dataset.accent = s.settings.accent; }, [s.settings.accent]);

  if (!isReady()) return <div class="loading-screen"><img class="logo-mark" src="./icon-192.png" alt="" style="width:72px;height:72px;border-radius:22px;animation:pop .6s both" /></div>;
  if (!s.profile.onboarded) return <Onboarding />;
  const Screen = SCREENS[ui.tab];
  return (
    <>
      <div class="screen" key={ui.tab + ':' + ui.tabKey}><Screen /></div>
      {!ui.stack.length && <MiniWorkoutBar />}
      <nav class="tabbar">
        {TABS.map((t) => (
          <button key={t.id} class={cx('tab', ui.tab === t.id && 'on')} onClick={() => { setTab(t.id); navigator.vibrate?.(6); }}>
            <t.icon size={23} strokeWidth={ui.tab === t.id ? 2.5 : 2} />
            {t.label}
          </button>
        ))}
      </nav>
      <OverlayHost />
      {ui.toast && <div class={cx('toast', ui.toast.kind)} key={ui.toast.id}>{ui.toast.message}</div>}
    </>
  );
}
