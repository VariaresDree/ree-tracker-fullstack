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
    if (confirm("New engine update available. Reload the matrix?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("System offline-ready. Tactical review matrices cached.");
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);