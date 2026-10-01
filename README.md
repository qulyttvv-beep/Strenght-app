# Forma — strength, nutrition & physique tracker

A free, private, local-first gym app for Android. No account, no subscription, no cloud:
everything lives on your phone. AI features are optional and use **free** AI APIs directly from your device.

**Minimum age: 13.** The app asks for a date of birth, blocks under-13s, and runs a gentler *teen mode* for 13–17
(capped calorie changes, higher calorie floors, no aggressive fat-loss goals, no physique-photo AI).

## Install the APK

1. On your phone open **https://github.com/qulyttvv-beep/Strenght-app/releases/tag/latest-apk** and download `Forma.apk`.
2. Open it and allow "install unknown apps" for your browser/file manager when Android asks.
3. Every push builds a fresh APK and replaces that release. Install a newer one **over** the old one – your data is kept
   because every build is signed with the same key.

## Features

| Area | What you get |
|---|---|
| **Train** | Live workout logger (previous-set autofill, tick-to-complete, rest timer, PR detection, warm-up/drop/failure sets), routines, history, 132-exercise library with muscle maps, weekly muscle-balance heatmap, custom exercises |
| **Workout creator** | Instant offline generator (goal, days, session length, equipment, experience, weak points) **or** "Design with AI" from a free-text request |
| **Eat** | Calories + macros + water, 200+ offline foods, packaged-food search via Open Food Facts, quick add, custom foods, copy yesterday |
| **AI calorie tracker** | Describe a meal or snap a photo → editable item list with calories/macros (Gemini, Groq, OpenRouter free models, keyless Pollinations, or any https OpenAI-style endpoint) |
| **Body fat estimator** | U.S. Navy tape method, 3-site calipers, quick formula (CUN-BAE) and an adults-only AI photo estimate; lean/fat mass, FFMI |
| **Progress** | Weight trend, measurements, **symmetry score** (V-taper, left/right balance, proportions), photo gallery with before/after slider, strength levels, smart maintenance estimate |
| **Goal checker** | Natural muscle-potential model (Casey Butt–style frame model) → is your goal realistic, ETA, phases |
| **AI Coach** | Short Q&A about training and food using your stats |
| **Backup** | Export/restore everything (incl. photos) as one JSON file |

## Setting up AI (free)

Open **You → AI & privacy**.
- Easiest and best: get a free key at <https://aistudio.google.com/apikey> (about a minute), paste it, tap **Test**.
  Gemini reads meal photos and has a generous free quota.
- "Automatic" mode uses whichever provider you added a key for, and falls back to the keyless Pollinations service.
- Free tiers have daily limits and model names change; use **Find models** if one stops working.

Nothing is sent unless you tap an AI button. Requests go straight from the phone to the provider you chose.
Photos are only sent for meal analysis / the adult physique check, one at a time, after a consent prompt.
The gallery is never uploaded.

## Your data

Stored in the app's IndexedDB on the device (`allowBackup` is off, so Android won't copy it to Google).
**Uninstalling the app deletes it** — use **You → Export backup** first when changing phones.

## Development

```bash
npm ci
npm run dev            # http://localhost:5173
npm test               # unit tests (maths, safety rules, generator, AI parsing)
npm run test:e2e       # builds, then walks the whole app in headless Chromium with mocked network
npm run build && npx cap sync android
```

Stack: Preact + Vite, hand-rolled SVG charts, IndexedDB, Capacitor 8 (Android WebView). ~90 KB gzipped JS, fonts bundled for offline use.

### Android build

`.github/workflows/android.yml` builds a signed release APK on every push and publishes it to the rolling
`latest-apk` release. Locally you need JDK 21 and the Android SDK (API 36): `cd android && ./gradlew assembleRelease`.

**Signing key:** `android/app/forma-sideload.jks` is committed on purpose so APK updates keep installing over each other
(and keep your data). It's a personal sideload key, not a Play Store key. If you want a private key instead, add
`FORMA_KEYSTORE` (path), `FORMA_KEYSTORE_PASSWORD`, `FORMA_KEY_ALIAS`, `FORMA_KEY_PASSWORD` as GitHub secrets / env vars —
Gradle prefers them. Note: switching keys means uninstalling once (export a backup first).

## Known limits

- The AI endpoints and Open Food Facts were exercised with mocked responses in tests; live behaviour depends on the
  providers' current free tiers and model names (editable in settings).
- No barcode camera scanner yet (type a barcode into the search box instead).
- The rest timer vibrates/beeps only while the app is open (no background notification).
- Body-fat, calorie and potential numbers are estimates for tracking trends — not medical advice.
