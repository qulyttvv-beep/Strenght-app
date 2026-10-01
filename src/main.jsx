import { render } from 'preact';
import './styles.css';
import { App } from './app.jsx';
import { initStore } from './lib/store.js';
import { initNav } from './ui/nav.js';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

initNav();
render(<App />, document.getElementById('app'));
initStore();

// Native chrome: dark status bar, hide the splash once we have painted.
(async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0b0d10' });
  } catch { /* status bar plugin unavailable */ }
  try { await SplashScreen.hide(); } catch { /* ignore */ }
})();
