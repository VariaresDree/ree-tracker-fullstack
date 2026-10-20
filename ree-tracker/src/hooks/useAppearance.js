// src/hooks/useAppearance.js
// Keeps the page in the chosen theme and background (Account › Appearance):
// the data-theme and data-texture attributes on <html> that styles/index.css
// keys on. The pre-paint script in index.html applies them first; this
// re-applies them when the store restores or changes them. Used by every
// layout that stands on its own: MainLayout, and the full-screen /focus page.
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { applyTexture, applyTheme } from '../theme/applyAppearance';

export function useAppearance() {
  // The theme alone: the UI slice also holds the sidebar's collapse, and the
  // whole shell re-rendered when it toggled.
  const theme = useStore((s) => s.theme);
  const plainBackground = useStore((s) => s.plainBackground);

  useEffect(() => {
    let stored = null;
    try { stored = localStorage.getItem('ree-theme'); } catch { /* storage unavailable */ }
    applyTheme(theme || stored || 'dark');
  }, [theme]);
  useEffect(() => {
    applyTexture(plainBackground);
  }, [plainBackground]);
}
