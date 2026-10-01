// Token limits are generous on purpose: Gemini 'flash' models spend part of maxOutputTokens on internal thinking.
// Free-tier AI client. Two wire formats: Google Gemini and OpenAI-compatible (Groq, OpenRouter, Pollinations, custom).
// Nothing is sent anywhere unless the user triggers an AI feature; photos are only sent for AI features, never for the gallery.
import { http, HttpError } from './net.js';
import { EXERCISES } from './exercises.js';
import { clamp, round } from './util.js';

export const PROVIDERS = {
  gemini: {
    id: 'gemini', name: 'Google Gemini', kind: 'gemini', needsKey: true, vision: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    models: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'],
    blurb: 'Best option. Free key in about a minute, sees photos, generous free quota.',
  },
  groq: {
    id: 'groq', name: 'Groq', kind: 'openai', needsKey: true, vision: true,
    base: 'https://api.groq.com/openai/v1', keyUrl: 'https://console.groq.com/keys',
    models: ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile'],
    textModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    blurb: 'Very fast free tier. Free key required.',
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter (free models)', kind: 'openai', needsKey: true, vision: true,
    base: 'https://openrouter.ai/api/v1', keyUrl: 'https://openrouter.ai/keys',
    models: ['google/gemma-3-27b-it:free', 'meta-llama/llama-4-maverick:free', 'mistralai/mistral-small-3.2-24b-instruct:free'],
    blurb: 'Pick any model tagged “:free”. Free key required.',
  },
  pollinations: {
    id: 'pollinations', name: 'Pollinations (no key)', kind: 'openai', needsKey: false, vision: true,
    base: 'https://text.pollinations.ai/openai', models: ['openai', 'openai-fast'],
    blurb: 'No signup. Community-run, so it can be slow or unavailable – experimental.',
  },
  custom: {
    id: 'custom', name: 'Custom (OpenAI-compatible)', kind: 'openai', needsKey: false, vision: true,
    base: '', models: [], blurb: 'Any OpenAI-style endpoint: Ollama on your network, LM Studio, Together, Mistral…',
  },
};
export const AUTO_ORDER = ['gemini', 'groq', 'openrouter', 'pollinations'];

export const defaultAiSettings = () => ({
  provider: 'auto', keys: {}, models: {}, customBase: '', photoConsent: false,
});

/** Work out which provider+model+key to use right now. */
export function resolveProvider(ai = defaultAiSettings()) {
  let id = ai.provider || 'auto';
  if (id === 'auto') id = AUTO_ORDER.find((p) => (PROVIDERS[p].needsKey ? !!ai.keys?.[p] : true)) || 'pollinations';
  const P = PROVIDERS[id] || PROVIDERS.pollinations;
  const key = (ai.keys?.[id] || '').trim();
  const model = (ai.models?.[id] || '').trim() || P.models[0] || '';
  const base = id === 'custom' ? (ai.customBase || '').trim().replace(/\/+$/, '') : P.base;
  return { ...P, key, model, base, configured: P.needsKey ? !!key : id === 'custom' ? !!base && !!model : true };
}

// ---------- low-level ----------
async function callGemini(cfg, { system, parts, temperature, maxTokens, json }) {
  const tryModels = [cfg.model, ...cfg.models.filter((m) => m !== cfg.model)];
  let lastErr;
  for (const model of tryModels) {
    try {
      const body = {
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) },
      };
      if (system) body.systemInstruction = { parts: [{ text: system }] };
      const data = await http(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': cfg.key }, json: body, timeout: 60000,
      });
      const cand = data?.candidates?.[0];
      const text = (cand?.content?.parts || []).map((p) => p.text || '').join('').trim();
      if (!text) {
        const why = data?.promptFeedback?.blockReason || cand?.finishReason || 'empty response';
        throw new HttpError(0, `The model returned nothing (${why}). Try again or rephrase.`);
      }
      return text;
    } catch (e) {
      lastErr = e;
      // try the next model on "model not found / unsupported / quota" – each model has its own free quota
      if (e instanceof HttpError && [400, 404, 429, 503].includes(e.status) && !/API key not valid|API_KEY_INVALID/i.test(String(e.message))) continue;
      throw e;
    }
  }
  throw lastErr;
}

async function callOpenAI(cfg, { system, parts, temperature, maxTokens, json }) {
  const content = parts.length === 1 && parts[0].text !== undefined ? parts[0].text : parts.map((p) => (p.text !== undefined ? { type: 'text', text: p.text } : { type: 'image_url', image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } }));
  const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content }];
  const headers = { ...(cfg.key ? { Authorization: `Bearer ${cfg.key}` } : {}), 'X-Title': 'Forma' };
  const url = cfg.id === 'pollinations' ? cfg.base : `${cfg.base}/chat/completions`;
  const base = { model: cfg.model, messages, temperature, max_tokens: maxTokens };
  const tryOnce = (body) => http(url, { method: 'POST', headers, json: body, timeout: 60000 });
  let data;
  try { data = await tryOnce(json ? { ...base, response_format: { type: 'json_object' } } : base); }
  catch (e) {
    if (json && e instanceof HttpError && e.status === 400) data = await tryOnce(base); // provider/model without JSON mode
    else throw e;
  }
  const text = (data?.choices?.[0]?.message?.content ?? (typeof data === 'string' ? data : '')).toString().trim();
  if (!text) throw new HttpError(0, 'The model returned nothing. Try again.');
  return text;
}

export function extractJson(text) {
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* fall through */ } }
  throw new HttpError(0, 'The AI answered in an unexpected format. Please try again.');
}

async function run(ai, { system, user, image, temperature = 0.2, maxTokens = 2048, json = true }) {
  const cfg = resolveProvider(ai);
  if (!cfg.configured) throw new HttpError(0, `Add a ${cfg.name} API key in Settings → AI to use this feature.`);
  if (image && !cfg.vision) throw new HttpError(0, `${cfg.name} cannot read photos. Switch provider in Settings → AI.`);
  const parts = [{ text: user }];
  if (image) {
    const m = /^data:([^;]+);base64,(.*)$/s.exec(image);
    if (!m) throw new HttpError(0, 'Invalid image');
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  const text = cfg.kind === 'gemini'
    ? await callGemini(cfg, { system, parts, temperature, maxTokens, json })
    : await callOpenAI(cfg, { system, parts, temperature, maxTokens, json });
  return { text, provider: cfg.name, model: cfg.model };
}

export async function aiJson(ai, opts) { const r = await run(ai, { ...opts, json: true }); return { data: extractJson(r.text), provider: r.provider, model: r.model }; }
export async function aiText(ai, opts) { return run(ai, { ...opts, json: false, temperature: opts.temperature ?? 0.5 }); }

export async function testAi(ai) {
  const t0 = performance.now();
  const r = await run(ai, { system: 'Reply with JSON only.', user: 'Return {"ok":true}', maxTokens: 1024 });
  extractJson(r.text);
  return { provider: r.provider, model: r.model, ms: Math.round(performance.now() - t0) };
}

export async function listModels(ai, providerId) {
  const id = providerId || resolveProvider(ai).id;
  const cfg = resolveProvider({ ...ai, provider: id });
  if (cfg.kind === 'gemini') {
    if (!cfg.key) throw new HttpError(0, 'Enter your Gemini key first.');
    const d = await http('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': cfg.key } });
    return (d.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini/i.test(m.name)).map((m) => m.name.replace(/^models\//, ''));
  }
  if (!cfg.base) throw new HttpError(0, 'Enter the base URL first.');
  const d = await http(`${cfg.base.replace(/\/chat\/completions$/, '')}/models`, { headers: cfg.key ? { Authorization: `Bearer ${cfg.key}` } : {} });
  const list = d.data || d.models || [];
  let ids = list.map((m) => (typeof m === 'string' ? m : m.id)).filter(Boolean);
  if (id === 'openrouter') ids = ids.filter((m) => /:free$/.test(m));
  return ids.sort();
}

// ---------- meal analysis ----------
const MEAL_SYSTEM = `You are a precise nutrition analyst inside a calorie-tracking app. The user describes a meal and/or sends a photo.
Identify every distinct food or drink, estimate the portion (use visual cues like plate size or packaging; if unknown assume one typical serving), and estimate calories and macros for that portion INCLUDING cooking oil, sauces and dressings.
Respond with ONLY valid JSON of exactly this shape:
{"items":[{"name":string,"amount":string,"grams":number,"kcal":number,"protein":number,"carbs":number,"fat":number}],"notes":string}
Rules: numbers only (no units). grams = estimated weight in grams (ml for drinks). protein/carbs/fat are grams. kcal should be close to 4*protein + 4*carbs + 9*fat (alcohol aside). Max 12 items. "amount" is a human description like "1 bowl (about 250 g)". "notes" is one short sentence about assumptions or uncertainty. If there is no food, return {"items":[],"notes":"No food detected"}.`;

export function normalizeMeal(raw) {
  const items = (raw?.items || []).slice(0, 14).map((it) => {
    const p = clamp(+it.protein || 0, 0, 400), c = clamp(+it.carbs || 0, 0, 800), f = clamp(+it.fat || 0, 0, 400);
    const derived = 4 * p + 4 * c + 9 * f;
    let kcal = clamp(+it.kcal || 0, 0, 4000);
    if (!kcal || (derived > 30 && Math.abs(kcal - derived) / Math.max(kcal, derived) > 0.4 && !/beer|wine|vodka|whisk|cocktail|alcohol|liquor/i.test(it.name || ''))) kcal = derived;
    return { name: String(it.name || 'Food').slice(0, 80), amount: String(it.amount || '1 serving').slice(0, 60), grams: clamp(round(+it.grams || 0), 0, 5000) || null, kcal: Math.round(kcal), p: round(p, 1), c: round(c, 1), f: round(f, 1) };
  }).filter((i) => i.kcal > 0 || i.p + i.c + i.f > 0);
  return { items, notes: String(raw?.notes || '').slice(0, 200) };
}

export async function analyzeMeal(ai, { text, image, meal }) {
  const user = `Meal type: ${meal || 'unspecified'}.\n${text ? `Description: ${text}` : 'No text description – use the photo.'}`;
  const { data, provider, model } = await aiJson(ai, { system: MEAL_SYSTEM, user, image, maxTokens: 4096 });
  return { ...normalizeMeal(data), provider, model };
}

// ---------- physique photo (adults only) ----------
const PHYSIQUE_SYSTEM = `You are a fitness coach giving a ROUGH visual estimate of body-fat percentage and physique balance from a progress photo. Visual estimates are typically off by ±4–5 percentage points, so be conservative and say so. Never comment on attractiveness.
Respond with ONLY JSON: {"bodyFatMin":number|null,"bodyFatMax":number|null,"confidence":"low"|"medium"|"high","summary":string,"strengths":[string],"weakPoints":[{"muscle":"chest|back|shoulders|biceps|triceps|quads|hamstrings|glutes|calves|abs|traps|forearms","note":string}],"observations":[string]}.
If the image is not a clear view of a person's physique, set bodyFatMin and bodyFatMax to null and explain in summary. Keep each string under 140 characters.`;

export async function analyzePhysique(ai, { image, sex, age, heightCm, weightKg }) {
  const user = `Person: ${sex}, ${age} years old, ${heightCm} cm, ${weightKg} kg. Estimate body fat and physique balance from this photo.`;
  const { data, provider, model } = await aiJson(ai, { system: PHYSIQUE_SYSTEM, user, image, maxTokens: 3000 });
  const lo = data.bodyFatMin == null ? null : clamp(+data.bodyFatMin, 3, 60);
  const hi = data.bodyFatMax == null ? null : clamp(+data.bodyFatMax, 3, 60);
  return {
    min: lo, max: hi, mid: lo != null && hi != null ? round((lo + hi) / 2, 1) : null,
    confidence: ['low', 'medium', 'high'].includes(data.confidence) ? data.confidence : 'low',
    summary: String(data.summary || '').slice(0, 400),
    strengths: (data.strengths || []).slice(0, 5).map(String),
    weakPoints: (data.weakPoints || []).slice(0, 5).map((w) => ({ muscle: String(w.muscle || ''), note: String(w.note || '') })),
    observations: (data.observations || []).slice(0, 6).map(String), provider, model,
  };
}

// ---------- workout planner ----------
const catalog = () => EXERCISES.map((e) => `${e.id}|${e.name}|${e.muscle}|${e.equip}|${e.type}`).join('\n');
const PLAN_SYSTEM = () => `You are an expert strength coach. Design a workout program as ONLY valid JSON:
{"name":string,"goal":string,"routines":[{"name":string,"notes":string,"exercises":[{"exId":string,"sets":number,"repMin":number,"repMax":number,"rest":number,"note":string}]}],"notes":[string]}
Rules:
- exId MUST be copied exactly from the catalog below (first column). Never invent ids.
- Put heavy compound lifts first, isolation work last. 4–9 exercises per routine. Sets 2–5.
- rest is in seconds. For type "time" exercises repMin/repMax are seconds; for type "cardio" they are minutes.
- Respect the user's equipment, days per week, session length, experience and any request. One routine per training day.
- For users under 18: moderate volume, technique-focused, no maxing out, no dieting advice.
- notes: up to 4 short coaching tips (progression, deload).
Catalog (id|name|muscle|equipment|type):
${catalog()}`;

export async function aiWorkoutPlan(ai, { request, profile, days, minutes, equip, experience, goal, age }) {
  const user = `Goal: ${goal}. Experience: ${experience}. Days per week: ${days}. Session length: ${minutes} minutes. Equipment: ${equip.join(', ')}. Age: ${age}. Sex: ${profile.sex}.
${request ? `User request: ${request}` : ''}`;
  const { data, provider, model } = await aiJson(ai, { system: PLAN_SYSTEM(), user, maxTokens: 8192, temperature: 0.4 });
  return { raw: data, provider, model };
}

// ---------- coach chat ----------
export async function askCoach(ai, { question, context, history = [], minor }) {
  const system = `You are Forma Coach, a concise, evidence-based strength and nutrition coach inside a fitness app. Answer in under 170 words, with practical next steps. No medical diagnoses; suggest a doctor for injuries or health conditions.${minor ? ' The user is under 18: do not give dieting, weight-cutting or calorie-restriction advice; focus on training technique, sleep, eating enough and talking to a parent or doctor.' : ''}
User context: ${context}`;
  const convo = history.slice(-6).map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text}`).join('\n');
  const r = await aiText(ai, { system, user: `${convo ? convo + '\n' : ''}User: ${question}`, maxTokens: 2000 });
  return r.text.replace(/^Coach:\s*/i, '');
}
