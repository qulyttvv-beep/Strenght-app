// UI-only state: current tab, overlay stack (pages / sheets / dialogs), toasts.
// Every overlay pushes a history entry so the Android back button (and browser back) closes the top overlay.
import { useSyncExternalStore } from 'preact/compat';
import { App as CapApp } from '@capacitor/app';
import { uid } from '../lib/util.js';
import { isNative } from '../lib/net.js';

let ui = { tab: 'home', stack: [], toast: null, tabKey: 0 };
const subs = new Set();
const set = (patch) => { ui = { ...ui, ...patch }; subs.forEach((f) => f()); };
export const useUi = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => ui);
export const getUi = () => ui;

export const setTab = (tab) => set({ tab, tabKey: ui.tab === tab ? ui.tabKey + 1 : ui.tabKey });

function open(kind, Comp, props = {}) {
  const entry = { key: uid(), kind, Comp, props, closing: false };
  history.pushState({ overlay: entry.key }, '');
  set({ stack: [...ui.stack, entry] });
  return entry.key;
}
export const openPage = (Comp, props) => open('page', Comp, props);
export const openSheet = (Comp, props) => open('sheet', Comp, props);
/** Replace the top overlay in place (no history change) – used for "workout page -> summary page". */
export function swapTop(Comp, props = {}, kind = 'page') {
  const entry = { key: uid(), kind, Comp, props, closing: false };
  history.replaceState({ overlay: entry.key }, '');
  set({ stack: [...ui.stack.slice(0, -1), entry] });
}
/** Close the top overlay (via history so back-button and UI stay in sync). */
export const closeTop = () => { if (ui.stack.length) history.back(); };
export const closeAll = () => { const n = ui.stack.length; if (n) history.go(-n); };
export const stackDepth = () => ui.stack.length;

function popTop() {
  const top = ui.stack[ui.stack.length - 1];
  if (!top) return false;
  top.onClose?.();
  set({ stack: ui.stack.map((e) => (e === top ? { ...e, closing: true } : e)) });
  setTimeout(() => set({ stack: ui.stack.filter((e) => e.key !== top.key) }), 200);
  return true;
}

/** Promise-based confirm dialog. */
export function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const entry = { key: uid(), kind: 'dialog', Comp: null, props: { title, message, confirmLabel, cancelLabel, danger }, closing: false };
    let settled = false;
    entry.resolve = (v) => { if (settled) return; settled = true; resolve(v); closeTop(); };
    entry.onClose = () => { if (!settled) { settled = true; resolve(false); } };
    history.pushState({ overlay: entry.key }, '');
    set({ stack: [...ui.stack, entry] });
  });
}

/** Resolves once dialogs/closing overlays have finished (so a following swapTop/openPage hits the right entry). */
export const settled = () => new Promise((resolve) => {
  const t0 = Date.now();
  const check = () => { if (!ui.stack.some((e) => e.closing || e.kind === 'dialog') || Date.now() - t0 > 700) resolve(); else setTimeout(check, 25); };
  setTimeout(check, 40);
});

let toastTimer;
export function toast(message, kind = 'info') {
  clearTimeout(toastTimer);
  set({ toast: { message, kind, id: uid() } });
  toastTimer = setTimeout(() => set({ toast: null }), 2600);
}

// ---- history / back handling ----
export function initNav() {
  history.replaceState({ guard: true }, '');
  history.pushState({ root: true }, '');
  addEventListener('popstate', () => {
    if (popTop()) return;
    if (ui.tab !== 'home') { set({ tab: 'home' }); history.pushState({ root: true }, ''); return; }
    if (isNative()) CapApp.exitApp();
    else history.pushState({ root: true }, '');
  });
}
