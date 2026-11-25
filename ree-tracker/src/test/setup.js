// Vitest setup — runs once before every test file. Hooks @testing-library's
// `expect` extensions (toBeInTheDocument, toHaveAttribute, etc.) and resets
// the DOM between tests via @testing-library/react's auto-cleanup.

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// findBy*/waitFor give up after 1 s by default, which a lazy chunk or a KaTeX
// render misses whenever the machine is loaded (see testTimeout in
// vite.config.js). A passing wait returns as soon as it's met, so a longer
// limit costs nothing; don't add per-call { timeout } below this.
configure({ asyncUtilTimeout: 10_000 });

// jsdom doesn't ship matchMedia; QuestionCard uses it via
// prefersReducedMotion(). Default to "no preference" so tests get full
// motion behavior; individual tests can override on `window.matchMedia`.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom doesn't ship ResizeObserver (Flashcard.jsx uses it to measure each
// flip face's height). No-op stub — tests that need to exercise a resize
// callback trigger it manually, matching how matchMedia is handled above.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom doesn't ship scrollIntoView either. Without it, Library's 150 ms
// "scroll to your links" timer threw an uncaught error whenever a loaded run
// kept the test alive past 150 ms. Tests that assert on scrolling replace it.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
