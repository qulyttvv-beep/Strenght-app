// End-to-end walkthrough in headless Chromium with mocked network. Run: npm run build && node tests/e2e.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const PORT = 4179;
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe', detached: true });
const cleanup = () => { try { process.kill(-server.pid); } catch { /* already gone */ } };
process.on('exit', cleanup);
process.on('uncaughtException', (e) => { console.error(e); cleanup(); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error(e); cleanup(); process.exit(1); });
await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('preview did not start')), 20000); server.stdout.on('data', (d) => { if (String(d).includes('Local')) { clearTimeout(t); res(); } }); server.on('error', rej); });

const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
const page = await ctx.newPage();

const problems = [];
const aiCalls = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));

// ---- mocked network ----
const mealJson = { items: [
  { name: 'Scrambled eggs', amount: '2 large eggs (about 120 g)', grams: 120, kcal: 200, protein: 13, carbs: 2, fat: 15 },
  { name: 'Whole-wheat toast with butter', amount: '2 slices (about 80 g)', grams: 80, kcal: 260, protein: 9, carbs: 30, fat: 11 },
] , notes: 'Assumed 1 tsp butter per slice.' };
const planJson = { name: 'Test AI plan', goal: 'muscle', routines: [{ name: 'Day A', notes: '', exercises: [{ exId: 'barbell-bench-press', sets: 4, repMin: 5, repMax: 8, rest: 150, note: '' }, { exId: 'made-up-exercise', sets: 3, repMin: 8, repMax: 12, rest: 60, note: '' }, { exId: 'lat-pulldown', sets: 3, repMin: 8, repMax: 12, rest: 90, note: '' }] }], notes: ['Add weight when all sets hit the top of the range.'] };
await ctx.route('**/*', async (route) => {
  const url = route.request().url();
  if (url.startsWith(`http://localhost:${PORT}`) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
  if (url.includes('generativelanguage.googleapis.com') || url.includes('pollinations.ai') || url.includes('api.groq.com')) {
    const body = route.request().postData() || '';
    aiCalls.push({ url, body });
    const isPlan = body.includes('Design a workout program') || body.includes('Catalog (id|name');
    const payload = isPlan ? planJson : body.includes('Return {\\"ok\\":true}') || body.includes('"ok":true') ? { ok: true } : body.includes('Estimate body fat') || body.includes('body-fat percentage') ? { bodyFatMin: 14, bodyFatMax: 18, confidence: 'medium', summary: 'Lean with decent shoulder width.', strengths: ['Shoulders'], weakPoints: [{ muscle: 'calves', note: 'Calves lag' }], observations: [] } : mealJson;
    const text = JSON.stringify(payload);
    if (url.includes('generativelanguage')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { content: text } }] }) });
  }
  if (url.includes('openfoodfacts')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ products: [{ code: '111', product_name: 'Crunchy Granola Bar', brands: 'TestCo', nutriments: { 'energy-kcal_100g': 450, proteins_100g: 8, carbohydrates_100g: 65, fat_100g: 16 }, serving_quantity: 40, serving_size: '40 g' }] }) });
  return route.abort();
});

let step = 0;
const shot = async (name) => { step++; await page.waitForTimeout(450); await page.screenshot({ path: path.join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`) }); };
const tapText = async (text, opts = {}) => { await page.getByText(text, { exact: opts.exact ?? true }).first().click({ timeout: 6000 }); await page.waitForTimeout(opts.wait ?? 250); };
const tapRole = async (name, role = 'button') => { await page.getByRole(role, { name }).first().click({ timeout: 6000 }); await page.waitForTimeout(250); };
const expectText = async (text, timeout = 6000) => { await page.getByText(text, { exact: false }).first().waitFor({ timeout }); };
const check = (cond, msg) => { if (!cond) { problems.push('ASSERT: ' + msg); console.log('  ✗', msg); } else console.log('  ✓', msg); };
const back = async () => { await page.keyboard.press('Escape').catch(() => {}); await page.goBack(); await page.waitForTimeout(450); };
const section = (t) => console.log('\n▸ ' + t);

await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('.onb');

section('Onboarding & age gate');
await shot('welcome');
await tapText('Get started');
// age gate: 12-year-old must be blocked
const yr = new Date().getFullYear();
await page.selectOption('select >> nth=0', '15'); await page.selectOption('select >> nth=1', '5'); await page.selectOption('select >> nth=2', String(yr - 12));
await page.waitForTimeout(300);
await expectText('Forma is for ages 13+');
check(await page.getByRole('button', { name: 'Continue' }).isDisabled(), 'under-13 cannot continue');
await shot('age-blocked');
await page.selectOption('select >> nth=2', String(yr - 15));
await expectText('Teen mode is on');
check(await page.getByRole('button', { name: 'Continue' }).isEnabled(), '15-year-old can continue');
await shot('age-teen');
await page.selectOption('select >> nth=2', String(yr - 28));
await expectText("you're 28");
await tapText('Continue');
await expectText('About you');
await page.fill('input[placeholder="What should we call you?"]', 'Alex');
await shot('about');
await tapText('Continue');
await tapText('Build muscle'); await shot('goal');
await tapText('Continue');
await tapText('Intermediate'); await tapText('4'); await shot('training');
await tapText('Continue');
await tapText('Moderately active');
await tapText('Continue');
await expectText('Your daily plan');
await shot('plan');
await tapText('Start training');
await page.waitForSelector('.tabbar');

section('Home');
await expectText('Hey, Alex');
await shot('home');
check(await page.getByText('Start workout').count() > 0, 'program generated, workout card shown');

section('Eat: search + AI log');
await tapText('Eat', { exact: true }); await shot('eat-empty');
await page.getByText('Add food').first().click(); await page.waitForTimeout(400);
await page.locator('.chips .chip', { hasText: 'Banana' }).first().click(); await page.waitForTimeout(500);
await page.locator('button.food', { hasText: 'Banana' }).first().click(); await page.waitForTimeout(500);
await shot('food-detail');
await page.getByRole('button', { name: /Add · \d+ kcal/ }).click(); await page.waitForTimeout(400);
await tapText('Done');
await page.waitForTimeout(400);
check(await page.getByText('Banana').count() > 0, 'banana logged');
await page.getByRole('button', { name: /AI log/ }).click(); await page.waitForTimeout(400);
await page.fill('textarea', '2 scrambled eggs and 2 slices of toast with butter');
await page.getByRole('button', { name: /Estimate calories/ }).click();
await expectText('2 items found', 8000);
await shot('ai-result');
check(aiCalls.length >= 1, 'AI endpoint was called (mocked)');
await page.getByRole('button', { name: /Add to/ }).click(); await page.waitForTimeout(500);
await tapText('Done');
await expectText('Scrambled eggs');
await shot('eat-logged');
// quick add + search online
await page.getByText('Add food').first().click(); await page.waitForTimeout(300);
await page.fill('input[placeholder^="Search foods"]', 'granola bar'); await page.waitForTimeout(1200);
await expectText('Crunchy Granola Bar');
await shot('search-online');
await back(); await page.waitForTimeout(300);

section('Train: workout');
await tapText('Train', { exact: true }); await page.waitForTimeout(400);
await shot('train');
await page.getByRole('button', { name: 'Start', exact: true }).first().click(); await page.waitForTimeout(600);
await shot('workout-start');
// fill first set weight/reps and tick
const firstSet = page.locator('.set').first();
await firstSet.locator('input').nth(0).fill('60'); await firstSet.locator('input').nth(1).fill('8');
await firstSet.locator('.ck').click(); await page.waitForTimeout(400);
await shot('workout-set-done');
check(await page.locator('.rest-pill').count() === 1, 'rest timer started after completing a set');
await page.locator('.set').nth(1).locator('input').nth(0).fill('60'); await page.locator('.set').nth(1).locator('input').nth(1).fill('8');
await page.locator('.set').nth(1).locator('.ck').click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Finish' }).click(); await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Finish', exact: true }).last().click().catch(() => {}); await page.waitForTimeout(900);
await expectText('Workout complete');
await shot('workout-summary');
await tapText('Done');
await page.waitForTimeout(500);
check(await page.getByText('History').count() > 0, 'history section visible');

section('Program builder (offline + AI)');
await page.getByRole('button', { name: /Build plan/ }).click(); await page.waitForTimeout(500);
await shot('builder');
await page.getByRole('button', { name: /Generate instantly/ }).click(); await page.waitForTimeout(600);
await expectText('Use program');
await shot('builder-result');
await page.getByRole('button', { name: 'Redo' }).click().catch(() => {});
await page.getByRole('button', { name: 'Back' }).first().click(); await page.waitForTimeout(400);
await page.getByRole('button', { name: /Design with AI/ }).click(); await page.waitForTimeout(1200);
await expectText('Test AI plan');
const hasMade = await page.getByText('made-up-exercise').count();
check(hasMade === 0, 'unknown AI exercise ids are dropped');
await shot('builder-ai');
await page.getByRole('button', { name: 'Use program' }).click(); await page.waitForTimeout(600);
check(await page.getByText('Day A').count() > 0, 'AI program installed as routine');

section('Progress');
await tapText('Progress', { exact: true }); await page.waitForTimeout(400);
await shot('progress-empty');
await page.getByRole('button', { name: 'Log' }).first().click(); await page.waitForTimeout(400);
await page.locator('.numwrap.big input').fill('78.4'); await tapText('Save'); await page.waitForTimeout(500);
await shot('progress-weight');
await tapText('Body fat estimator'); await page.waitForTimeout(500);
await shot('bodyfat-quick');
await tapText('Tape'); await page.waitForTimeout(300);
const inputs = page.locator('.page-body input.input');
await inputs.nth(1).fill('38'); await inputs.nth(2).fill('86'); await page.waitForTimeout(400);
await shot('bodyfat-tape');
const val = await page.locator('.hero .big-num').first().innerText();
check(/\d/.test(val), `tape estimate shows a number (${val.replace(/\n/g, ' ')})`);
await page.getByRole('button', { name: /^Save/ }).click(); await page.waitForTimeout(500);
await tapText('Measurements'); await page.waitForTimeout(400);
const mi = page.locator('.page-body input.input');
const fill = async (label, v) => { await page.locator('.field', { hasText: label }).first().locator('input').fill(String(v)); };
await fill('Shoulders', 120); await fill('Waist', 82); await fill('Bicep (L)', 36); await fill('Bicep (R)', 38.5); await fill('Thigh (L)', 58); await fill('Thigh (R)', 58.5); await fill('Calf (L)', 37); await fill('Calf (R)', 37.5); await fill('Neck', 39); await fill('Chest', 104); await fill('Hips', 98);
await shot('measurements');
await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(500);
await tapText('Symmetry check'); await page.waitForTimeout(700);
await shot('symmetry');
check(await page.getByText('SYMMETRY SCORE').count() > 0, 'symmetry score rendered');
await back(); await page.waitForTimeout(300);
await tapText('Goals'); await page.waitForTimeout(400);
await shot('goals');
await page.getByText('+3 kg muscle').click(); await page.waitForTimeout(500);
await shot('goals-preset');
await tapText('Lifts'); await page.waitForTimeout(400);
await shot('lifts');

section('Photos');
await tapText('Photos'); await page.waitForTimeout(400);
await shot('photos-empty');
const png = await page.screenshot();
await page.getByRole('button', { name: /Add photo/ }).first().click(); await page.waitForTimeout(500);
await page.locator('input[type=file]:not([capture])').first().setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png });
await page.waitForTimeout(600);
await shot('photo-sheet');
await page.getByRole('button', { name: 'Save to gallery' }).click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Add photo/ }).first().click(); await page.waitForTimeout(400);
await page.locator('input[type=file]:not([capture])').first().setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: png });
await page.waitForTimeout(500);
await page.locator('.sheet').getByText('Side', { exact: true }).click(); await page.locator('.sheet').getByText('Yesterday', { exact: true }).click();
await page.getByRole('button', { name: 'Save to gallery' }).click(); await page.waitForTimeout(1200);
await shot('photos-grid');
check(await page.locator('.photo-grid .ph').count() === 2, 'two photos in gallery');
await page.getByRole('button', { name: /Compare/ }).click(); await page.waitForTimeout(800);
await shot('compare');
check(await page.locator('.compare').count() === 1, 'compare slider rendered');
await back();

section('You / settings');
await tapText('You', { exact: true }); await page.waitForTimeout(400);
await shot('you');
await tapText('AI & privacy'); await page.waitForTimeout(400);
await page.locator('input[type=password]').first().fill('test-key-123');
await shot('ai-settings');
await page.getByRole('button', { name: /Test/ }).click(); await page.waitForTimeout(1200);
await expectText('Connected to');
await shot('ai-tested');
await back();
await page.getByLabel('pink').click(); await page.waitForTimeout(300);
check((await page.evaluate(() => document.documentElement.dataset.accent)) === 'pink', 'accent colour switches');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByText('Export backup').first().click()]);
const bpath = path.join(SHOTS, 'backup.json'); await dl.saveAs(bpath);
const backup = JSON.parse(fs.readFileSync(bpath, 'utf8'));
check(backup.app === 'forma' && backup.photos.length === 2 && backup.data.history.length === 1, 'backup contains workouts and photos');

section('Persistence');
await page.reload(); await page.waitForSelector('.tabbar'); await page.waitForTimeout(500);
await tapText('Eat', { exact: true }); await page.waitForTimeout(300);
check(await page.getByText('Scrambled eggs').count() > 0, 'food log survived reload');
await tapText('Progress', { exact: true }); await tapText('Photos'); await page.waitForTimeout(500);
check(await page.locator('.photo-grid .ph').count() === 2, 'photos survived reload');

await shot('end');
await browser.close(); cleanup();
fs.writeFileSync(path.join(SHOTS, 'ai-calls.json'), JSON.stringify(aiCalls.map((c) => ({ url: c.url, body: c.body.slice(0, 600) })), null, 1));
console.log('\nAI calls made:', aiCalls.length);
if (problems.length) { console.log('\nPROBLEMS:\n' + problems.map((p) => ' - ' + p).join('\n')); process.exit(1); }
console.log('\nAll good.');
