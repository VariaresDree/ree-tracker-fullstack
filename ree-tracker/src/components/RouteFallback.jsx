// src/components/RouteFallback.jsx
// Neutral lazy-route fallback. The dashboard keeps its dedicated skeleton;
// every other route gets this so users don't see a "Dashboard" skeleton flash
// while an unrelated page chunk loads.
//
// Shares the animated BrandMark with the boot screen rather than a generic
// spinner: this fires on every lazy route transition, so it's the loading
// state users actually see most, and a spinner reads as "stuck" where a
// drawing trace reads as "working". Inline (not fixed/fullscreen) so the
// surrounding app chrome stays put.
import BrandMark from './BrandMark';

export default function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <BrandMark size={52} />
      <span className="text-eyebrow">Loading module</span>
    </div>
  );
}
