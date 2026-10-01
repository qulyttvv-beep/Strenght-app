// Small design-system components shared by every screen.
import { useState, useRef, useEffect } from 'preact/hooks';
import { X, ChevronLeft, ChevronRight, Check, Minus, Plus } from 'lucide-preact';
import { closeTop } from './nav.js';
import { vibrate } from '../lib/util.js';

export const cx = (...a) => a.filter(Boolean).join(' ');
export const tap = (ms = 8) => vibrate(ms);

export function Btn({ variant = 'primary', size = 'md', icon: Icon, children, block, class: c, onClick, disabled, loading, ...rest }) {
  return (
    <button class={cx('btn', `btn-${variant}`, `btn-${size}`, block && 'btn-block', c)} disabled={disabled || loading} onClick={(e) => { tap(); onClick?.(e); }} {...rest}>
      {loading ? <span class="spin" /> : Icon ? <Icon size={size === 'sm' ? 16 : 19} strokeWidth={2.4} /> : null}
      {children != null && <span>{children}</span>}
    </button>
  );
}
export const IconBtn = ({ icon: Icon, label, onClick, class: c, size = 22, active, ...rest }) => (
  <button class={cx('iconbtn', active && 'active', c)} aria-label={label} onClick={(e) => { tap(); onClick?.(e); }} {...rest}><Icon size={size} strokeWidth={2.2} /></button>
);

export const Card = ({ children, class: c, onClick, pad = true, ...rest }) => (
  <div class={cx('card', pad && 'card-pad', onClick && 'pressable', c)} onClick={onClick ? (e) => { tap(6); onClick(e); } : undefined} {...rest}>{children}</div>
);

export const Section = ({ title, action, onAction, children, class: c, sub }) => (
  <section class={cx('section', c)}>
    {(title || action) && (
      <div class="section-head">
        <div><h2>{title}</h2>{sub && <div class="muted small">{sub}</div>}</div>
        {action && <button class="link" onClick={onAction}>{action}</button>}
      </div>
    )}
    {children}
  </section>
);

export const Segmented = ({ options, value, onChange, class: c, size }) => (
  <div class={cx('seg', size && `seg-${size}`, c)}>
    {options.map((o) => (
      <button key={o.id} class={cx('seg-btn', value === o.id && 'on')} onClick={() => { tap(6); onChange(o.id); }}>{o.label}</button>
    ))}
  </div>
);

export const Chip = ({ children, on, onClick, icon: Icon, class: c }) => (
  <button class={cx('chip', on && 'on', c)} onClick={() => { tap(6); onClick?.(); }}>{Icon && <Icon size={14} strokeWidth={2.4} />}{children}</button>
);

export const Toggle = ({ on, onChange }) => (
  <button role="switch" aria-checked={on} class={cx('toggle', on && 'on')} onClick={() => { tap(6); onChange(!on); }}><i /></button>
);

export const Field = ({ label, hint, children, class: c, right }) => (
  <label class={cx('field', c)}>
    {(label || right) && <span class="field-label"><span>{label}</span>{right}</span>}
    {children}
    {hint && <span class="field-hint">{hint}</span>}
  </label>
);

/** Text-backed number input so users can type "12." or clear the box. Emits number | null. */
export function NumInput({ value, onChange, unit, placeholder, decimals = 1, min, max, class: c, big, autofocus, onEnter, ...rest }) {
  const [txt, setTxt] = useState(value == null ? '' : String(value));
  const last = useRef(value);
  useEffect(() => { if (value !== last.current) { last.current = value; setTxt(value == null ? '' : String(value)); } }, [value]);
  const commit = (v) => {
    setTxt(v);
    const n = parseFloat(v.replace(',', '.'));
    let out = Number.isFinite(n) ? n : null;
    if (out != null) { if (min != null) out = Math.max(min, out); if (max != null) out = Math.min(max, out); }
    last.current = out; onChange(out);
  };
  return (
    <div class={cx('numwrap', big && 'big', c)}>
      <input class="input" inputmode={decimals ? 'decimal' : 'numeric'} type="text" enterkeyhint="done" autocomplete="off" placeholder={placeholder} value={txt} autofocus={autofocus}
        onInput={(e) => { const v = e.currentTarget.value.replace(/[^0-9.,]/g, ''); commit(v); }}
        onBlur={() => { if (value != null) setTxt(String(value)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); onEnter?.(); } }} {...rest} />
      {unit && <span class="unit">{unit}</span>}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, format = (v) => v }) {
  return (
    <div class="stepper">
      <button onClick={() => { tap(6); onChange(Math.max(min, +(value - step).toFixed(2))); }}><Minus size={18} /></button>
      <span>{format(value)}</span>
      <button onClick={() => { tap(6); onChange(Math.min(max, +(value + step).toFixed(2))); }}><Plus size={18} /></button>
    </div>
  );
}

export const Row = ({ icon: Icon, title, sub, right, onClick, danger, class: c, chevron }) => (
  <div class={cx('row', onClick && 'pressable', danger && 'danger', c)} onClick={onClick ? () => { tap(6); onClick(); } : undefined}>
    {Icon && <div class="row-icon"><Icon size={19} strokeWidth={2.2} /></div>}
    <div class="row-main"><div class="row-title">{title}</div>{sub && <div class="row-sub">{sub}</div>}</div>
    {right}
    {onClick && chevron !== false && <ChevronRight size={18} class="muted" />}
  </div>
);

export const Empty = ({ icon: Icon, title, text, action }) => (
  <div class="empty">
    {Icon && <div class="empty-icon"><Icon size={28} strokeWidth={1.8} /></div>}
    <div class="empty-title">{title}</div>
    {text && <div class="muted">{text}</div>}
    {action && <div style="margin-top:14px">{action}</div>}
  </div>
);

export const Progress = ({ value, max = 1, color, height = 8 }) => (
  <div class="bar" style={{ height }}><i style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`, background: color }} /></div>
);

export const Spinner = ({ size = 18 }) => <span class="spin" style={{ width: size, height: size }} />;

export const Badge = ({ children, tone = 'muted' }) => <span class={cx('badge', `badge-${tone}`)}>{children}</span>;

// ---- containers ----
/** Full-screen page that slides in from the right. */
export function Page({ title, right, children, footer, onBack, class: c, subtitle }) {
  return (
    <div class={cx('page', c)}>
      <header class="page-head">
        <button class="iconbtn" aria-label="Back" onClick={() => (onBack ? onBack() : closeTop())}><ChevronLeft size={26} strokeWidth={2.2} /></button>
        <div class="page-title"><div>{title}</div>{subtitle && <small>{subtitle}</small>}</div>
        <div class="page-right">{right}</div>
      </header>
      <div class="page-body">{children}</div>
      {footer && <div class="page-foot">{footer}</div>}
    </div>
  );
}

/** Bottom sheet; drag the handle down to dismiss. */
export function Sheet({ title, children, footer, tall, onClose, right }) {
  const ref = useRef();
  const drag = useRef({ y: 0, dy: 0, on: false });
  const down = (e) => { drag.current = { y: e.clientY, dy: 0, on: true }; e.currentTarget.setPointerCapture(e.pointerId); ref.current.style.transition = 'none'; };
  const move = (e) => { if (!drag.current.on) return; drag.current.dy = Math.max(0, e.clientY - drag.current.y); ref.current.style.transform = `translateY(${drag.current.dy}px)`; };
  const up = () => {
    if (!drag.current.on) return; drag.current.on = false;
    ref.current.style.transition = '';
    if (drag.current.dy > 110) (onClose || closeTop)(); else ref.current.style.transform = '';
  };
  return (
    <div class={cx('sheet', tall && 'tall')} ref={ref}>
      <div class="sheet-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><i /></div>
      {(title || right) && <div class="sheet-head"><h3>{title}</h3>{right || <button class="iconbtn" aria-label="Close" onClick={() => (onClose || closeTop)()}><X size={22} /></button>}</div>}
      <div class="sheet-body">{children}</div>
      {footer && <div class="sheet-foot">{footer}</div>}
    </div>
  );
}

export const CheckRow = ({ on, label, sub, onClick }) => (
  <button class={cx('checkrow', on && 'on')} onClick={() => { tap(6); onClick(); }}>
    <span class="checkbox">{on && <Check size={15} strokeWidth={3.2} />}</span>
    <span class="row-main"><span class="row-title">{label}</span>{sub && <span class="row-sub">{sub}</span>}</span>
  </button>
);
