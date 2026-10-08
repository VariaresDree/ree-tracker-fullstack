import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// PWA Service Worker Registration
import { registerSW } from 'virtual:pwa-register';

// Initializes background caching and auto-updates when a new deployment is detected
const updateSW = registerSW({
  onNeedRefresh() {
    // Optional: You can trigger a custom toast notification here later
    if (confirm('A new version of REE.ai is ready. Reload now?')) {
      updateSW(true);
    }
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