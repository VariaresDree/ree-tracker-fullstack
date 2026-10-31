import React from 'react';
import ReactDOM from 'react-dom/client';
import toast from 'react-hot-toast';
import App from './App';
import './styles/index.css';
import { wakeBackend } from './services/wakeBackend';
import { startConnectionWatch } from './services/connection';
import { startUpdateWatch, onNewVersionReady } from './services/appUpdate';

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register';

// Start the backend's boot now, while sign-in loads (services/wakeBackend).
wakeBackend();
// Come back from a dropped connection or a sleeping server without a reload
// (services/connection): fetch again when the server answers, and wake it
// when the app returns after a long time away.
startConnectionWatch({ wake: wakeBackend });

// A screen's code that can't be loaded even after its retries
// (utils/lazyWithRetry) is usually a chunk from an older version, gone after
// a deploy. Reload once to get the current one, never in a loop.
const CHUNK_RELOAD_KEY = 'ree:chunk-reload-at';
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

// A toast with Reload, not a blocking confirm(): the dialog stopped whatever
// the learner was doing (mid-question, mid-exam) to ask. The reload also
// happens by itself at the next safe moment (services/appUpdate).
const offerReload = () => {
  toast((t) => (
    <span className="flex items-center gap-3">
      REE.ai has been updated.
      <button
        type="button"
        className="touch-target px-3 py-1.5 rounded-[var(--radius-default)] bg-surface2 border border-border text-textMain text-sm font-medium cursor-pointer"
        onClick={() => { toast.dismiss(t.id); window.location.reload(); }}
      >
        Reload
      </button>
    </span>
  ), { id: 'app-update', duration: Infinity });
};

// A new deployment's service worker takes over as soon as it installs
// (registerType 'autoUpdate'); the page moves onto it at a safe moment.
registerSW({
  onNeedReload: onNewVersionReady,
  onRegisteredSW(_url, registration) {
    startUpdateWatch({ registration, notify: offerReload });
  },
  onOfflineReady() {
    console.log('REE.ai is ready to work offline.');
  },
});

// Ask the browser to persist storage so the offline question pack + sync queue
// (IndexedDB) aren't evicted under storage pressure — matters most on iOS/Safari,
// which can otherwise clear IndexedDB after inactivity. Best-effort, one-time.
if (navigator.storage?.persist) {
  Promise.resolve(navigator.storage.persisted?.())
    .then((already) => { if (!already) return navigator.storage.persist(); })
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);