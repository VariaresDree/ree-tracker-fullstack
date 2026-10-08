import React from 'react';

// Pure-decoration placeholders — hidden from assistive tech; the parent
// container carries the single role="status" loading announcement.
export function SkeletonCard({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton-shimmer h-32 rounded-xl ${className}`} />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-shimmer h-3 rounded" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}

export function SkeletonChart({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton-shimmer h-[350px] rounded-xl ${className}`} />;
}

export function TodaySkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading Today" className="flex flex-col gap-6 w-full max-w-5xl mx-auto page-fade-in">
      {/* Mirrors the real page: the header with its chips, then the Today
          card's three figures and its action rows, so nothing jumps on load. */}
      <div className="flex flex-col gap-2">
        <div className="skeleton-shimmer h-8 w-40 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-56 rounded" />
      </div>
      <div aria-hidden="true" className="rounded-[var(--radius-lg)] border border-border p-5 sm:p-6 flex flex-col gap-6">
        <div className="skeleton-shimmer h-7 w-72 max-w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-14 rounded-[var(--radius-default)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
