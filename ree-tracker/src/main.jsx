import React from 'react';
import ReactDOM from 'react-dom/client';
import toast from 'react-hot-toast';
import App from './App';
import './styles/index.css';

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register';

// Initializes background caching and auto-updates when a new deployment is detected
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