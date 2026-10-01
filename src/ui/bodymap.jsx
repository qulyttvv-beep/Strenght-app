// Stylised front/back body diagram. weights: { muscleId: 0..1 } -> fill intensity in that muscle's colour.
import { MUSCLES } from '../lib/exercises.js';

const BASE = '#2b323d', SIL = '#1a2028', EDGE = '#10141a';

// region = [muscleId, svg path d]; drawn for the LEFT half and mirrored for the right half unless {center:true}
const FRONT = [
  ['traps', 'M97 47 C88 50 78 54 66 60 L74 63 C82 59 90 57 97 57 Z'],
  ['shoulders', 'M66 60 C57 60 49 67 47 79 C46 88 50 94 55 95 C60 88 64 78 74 66 C72 62 70 60 66 60 Z'],
  ['chest', 'M75 67 C86 62 96 64 99 68 L99 97 C92 105 80 105 72 97 C70 85 70 75 75 67 Z'],
  ['abs', 'M89 108 h10 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 v-10 a2 2 0 0 1 2 -2 Z M89 125 h10 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 v-10 a2 2 0 0 1 2 -2 Z M89 142 h10 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 v-9 a2 2 0 0 1 2 -2 Z'],
  ['abs', 'M76 104 L86 108 L86 152 C79 142 75 126 76 104 Z'],
  ['biceps', 'M49 90 C43 102 41 115 43 127 L55 129 C59 115 61 102 59 91 Z'],
  ['forearms', 'M43 132 C40 148 38 163 38 176 L48 178 C51 163 54 148 55 132 Z'],
  ['quads', 'M72 176 C65 204 65 236 71 264 L96 264 C99 236 100 204 98 176 Z'],
  ['calves', 'M72 276 C70 298 72 322 78 342 L90 342 C94 322 95 298 93 276 Z'],
];
const BACK = [
  ['traps', 'M100 46 L82 56 L68 63 C77 73 90 79 100 94 Z'],
  ['shoulders', 'M66 60 C57 60 49 67 47 79 C46 88 50 94 55 95 C60 88 64 78 74 66 C72 62 70 60 66 60 Z'],
  ['back', 'M76 80 C70 98 74 120 91 140 L100 140 L100 100 C90 96 82 90 76 80 Z'],
  ['back', 'M91 142 L100 144 L100 172 C94 168 90 158 91 142 Z'],
  ['triceps', 'M49 90 C43 102 41 115 43 127 L55 129 C59 115 61 102 59 91 Z'],
  ['forearms', 'M43 132 C40 148 38 163 38 176 L48 178 C51 163 54 148 55 132 Z'],
  ['glutes', 'M73 176 C69 192 76 206 100 208 L100 172 Z'],
  ['hamstrings', 'M72 212 C67 234 69 254 74 266 L96 266 C99 242 100 226 100 212 Z'],
  ['calves', 'M72 274 C68 294 70 318 78 342 L90 342 C96 320 98 294 96 274 Z'],
];

function Figure({ regions, weights, id }) {
  const fill = (m) => {
    const w = Math.max(0, Math.min(1, weights[m] || 0));
    return w > 0.02 ? { fill: MUSCLES[m]?.color || '#fff', opacity: 0.35 + w * 0.65 } : { fill: BASE, opacity: 1 };
  };
  const mirror = 'translate(200 0) scale(-1 1)';
  return (
    <svg viewBox="0 0 200 352" width="100%" role="img" aria-label={id}>
      {/* silhouette */}
      <g fill={SIL} stroke={EDGE} stroke-width="1">
        <circle cx="100" cy="26" r="16" />
        <rect x="92" y="38" width="16" height="14" rx="5" />
        <path d="M66 58 C58 58 48 64 46 78 L40 130 L34 176 C33 186 40 190 46 186 L52 152 L60 112 L64 154 C66 170 68 176 72 178 L70 266 L72 346 L92 346 L98 270 L100 212 L102 270 L108 346 L128 346 L130 266 L128 178 C132 176 134 170 136 154 L140 112 L148 152 L154 186 C160 190 167 186 166 176 L160 130 L154 78 C152 64 142 58 134 58 Z" />
      </g>
      {[false, true].map((m) => (
        <g key={m} transform={m ? mirror : undefined}>
          {regions.map(([muscle, d], i) => <path key={i} d={d} {...fill(muscle)} stroke={EDGE} stroke-width="0.8" stroke-linejoin="round" />)}
        </g>
      ))}
    </svg>
  );
}

export function BodyMap({ weights = {}, width = '100%', labels = true }) {
  return (
    <div style={{ display: 'flex', gap: 10, width, justifyContent: 'center' }}>
      <div style={{ flex: 1, maxWidth: 170 }}><Figure regions={FRONT} weights={weights} id="Front" />{labels && <div class="center tiny faint bold" style="margin-top:2px">FRONT</div>}</div>
      <div style={{ flex: 1, maxWidth: 170 }}><Figure regions={BACK} weights={weights} id="Back" />{labels && <div class="center tiny faint bold" style="margin-top:2px">BACK</div>}</div>
    </div>
  );
}
