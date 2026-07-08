// src/components/RouteFallback.jsx
// Neutral lazy-route fallback. The dashboard keeps its dedicated skeleton;
// every other route gets this spinner so users don't see a "Dashboard"
// skeleton flash while an unrelated page chunk loads.
export default function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <span className="telemetry-spinner !w-8 !h-8 border-reeBlue border-t-transparent" aria-hidden="true"></span>
      <span className="text-muted2 font-mono uppercase tracking-widest text-xs">Loading Module...</span>
    </div>
  );
}
