// Renders launcher icons + splash from assets/logo-foreground.svg using Chromium.
// Usage: node scripts/make-icons.mjs   (CHROMIUM_PATH overrides the browser binary)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const res = path.join(root, 'android/app/src/main/res');
const fg = fs.readFileSync(path.join(root, 'assets/logo-foreground.svg'), 'utf8');
const BG = '#0b0d10';
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox'] });
const page = await browser.newPage();

async function render(html, size, out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${html}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, omitBackground: true });
}
const inner = (s, size) => fg.replace('<svg ', `<svg width="${size}" height="${size}" style="position:absolute;left:0;top:0" `);

const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  const legacy = Math.round(48 * k), adaptive = Math.round(108 * k);
  const dir = path.join(res, `mipmap-${d}`);
  // legacy square (rounded) and round icons: logo scaled to fill ~84%
  const logo = (size) => inner(fg, size).replace('style="position:absolute;left:0;top:0"', `style="position:absolute;left:${-size * 0.17}px;top:${-size * 0.17}px;width:${size * 1.34}px;height:${size * 1.34}px"`);
  await render(`<div style="position:relative;width:${legacy}px;height:${legacy}px;border-radius:${legacy * 0.22}px;overflow:hidden;background:radial-gradient(circle at 30% 20%,#1d2330,${BG})">${logo(legacy)}</div>`, legacy, path.join(dir, 'ic_launcher.png'));
  await render(`<div style="position:relative;width:${legacy}px;height:${legacy}px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 30% 20%,#1d2330,${BG})">${logo(legacy)}</div>`, legacy, path.join(dir, 'ic_launcher_round.png'));
  // adaptive foreground (transparent, 108dp canvas)
  await render(`<div style="position:relative;width:${adaptive}px;height:${adaptive}px">${inner(fg, adaptive)}</div>`, adaptive, path.join(dir, 'ic_launcher_foreground.png'));
}
// 512 store/preview icon + web favicon
await render(`<div style="position:relative;width:512px;height:512px;border-radius:112px;overflow:hidden;background:radial-gradient(circle at 30% 20%,#1d2330,${BG})">${inner(fg, 512).replace('style="position:absolute;left:0;top:0"', 'style="position:absolute;left:-87px;top:-87px;width:686px;height:686px"')}</div>`, 512, path.join(root, 'assets/icon-512.png'));
await render(`<div style="position:relative;width:192px;height:192px;border-radius:42px;overflow:hidden;background:radial-gradient(circle at 30% 20%,#1d2330,${BG})">${inner(fg, 192).replace('style="position:absolute;left:0;top:0"', 'style="position:absolute;left:-33px;top:-33px;width:258px;height:258px"')}</div>`, 192, path.join(root, 'public/icon-192.png'));
await browser.close();

// Replace template splash bitmaps with a solid dark layer-list.
for (const d of fs.readdirSync(res)) {
  if (/^drawable-(port|land)-/.test(d)) fs.rmSync(path.join(res, d), { recursive: true, force: true });
}
fs.rmSync(path.join(res, 'drawable/splash.png'), { force: true });
fs.writeFileSync(path.join(res, 'drawable/splash.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item><shape android:shape="rectangle"><solid android:color="${BG}"/></shape></item>
    <item android:gravity="center" android:width="170dp" android:height="170dp">
        <bitmap android:src="@mipmap/ic_launcher_foreground" android:gravity="center"/>
    </item>
</layer-list>
`);
fs.writeFileSync(path.join(res, 'values/ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG}</color>
</resources>
`);
console.log('icons done');
