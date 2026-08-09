// Vitest setup — runs once before every test file. Hooks @testing-library's
// `expect` extensions (toBeInTheDocument, toHaveAttribute, etc.) and resets
// the DOM between tests via @testing-library/react's auto-cleanup.

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

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
