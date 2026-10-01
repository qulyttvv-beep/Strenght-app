import { NumInput, Field } from './kit.jsx';
import { isImperial, dispWeight, parseWeight, dispLen, parseLen, weightUnit, lenUnit, cmToFtIn, ftInToCm } from '../lib/util.js';

/** Weight stored in kg; edited in the user's unit. */
export const WeightInput = ({ kg, units, onChange, label, big, hint, autofocus, onEnter }) => (
  <Field label={label} hint={hint}>
    <NumInput big={big} autofocus={autofocus} onEnter={onEnter} value={kg == null ? null : dispWeight(kg, units)} unit={weightUnit(units)} placeholder="0" onChange={(v) => onChange(v == null ? null : parseWeight(v, units))} />
  </Field>
);
export const LengthInput = ({ cm, units, onChange, label, hint, placeholder = '0' }) => (
  <Field label={label} hint={hint}>
    <NumInput value={cm == null ? null : dispLen(cm, units)} unit={lenUnit(units)} placeholder={placeholder} onChange={(v) => onChange(v == null ? null : parseLen(v, units))} />
  </Field>
);
export function HeightInput({ cm, units, onChange, label = 'Height' }) {
  if (!isImperial(units)) return <Field label={label}><NumInput value={cm == null ? null : Math.round(cm)} decimals={0} unit="cm" placeholder="175" onChange={(v) => onChange(v)} /></Field>;
  const { ft, inch } = cm ? cmToFtIn(cm) : { ft: null, inch: null };
  return (
    <Field label={label}>
      <div class="grid2">
        <NumInput value={ft} decimals={0} unit="ft" placeholder="5" onChange={(v) => onChange(ftInToCm(v, inch ?? 0))} />
        <NumInput value={inch} decimals={0} unit="in" placeholder="10" onChange={(v) => onChange(ftInToCm(ft ?? 0, v))} />
      </div>
    </Field>
  );
}
