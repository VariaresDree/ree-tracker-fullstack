import React from 'react';
import ReactDOM from 'react-dom/client';
import toast from 'react-hot-toast';
import App from './App';
import './styles/index.css';
import { wakeBackend } from './services/wakeBackend';
import { startConnectionWatch } from './services/connection';

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

// Background caching. A new deployment waits (registerType 'prompt' in
// vite.config.js): it applies on the next launch, or now from this toast.
const updateSW = registerSW({
  // A toast with Reload, not a blocking confirm(): the dialog stopped
  // whatever the learner was doing (mid-question, mid-exam) to ask.
  onNeedRefresh() {
    toast((t) => (
      <span className="flex items-center gap-3">
        A new version of REE.ai is ready.
        <button
          type="button"
          className="touch-target px-3 py-1.5 rounded-[var(--radius-default)] bg-surface2 border border-border text-textMain text-sm font-medium cursor-pointer"
          onClick={() => { toast.dismiss(t.id); updateSW(true); }}
        >
          Reload
        </button>
      </span>
    ), { id: 'app-update', duration: Infinity });
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