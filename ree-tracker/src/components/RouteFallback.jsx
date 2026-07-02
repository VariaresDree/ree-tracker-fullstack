// src/components/RouteFallback.jsx
// Neutral lazy-route fallback. The dashboard keeps its dedicated skeleton;
// every other route gets this spinner so users don't see a "Dashboard"
// skeleton flash while an unrelated page chunk loads.
export default function RouteFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <span className="telemetry-spinner !w-8 !h-8 border-reeBlue border-t-transparent"></span>
      <span className="text-muted2 font-mono uppercase tracking-widest text-xs">Loading Module...</span>
    </div>
  );
}
