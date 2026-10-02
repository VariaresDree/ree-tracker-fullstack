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

export function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading dashboard" className="p-6 space-y-6 page-fade-in">
      {/* Mirrors the real layout: header, Today panel, 4-tile KPI strip,
          trajectory + forecast row — so the page doesn't jump on load. */}
      <div className="skeleton-shimmer h-8 w-64 rounded-lg" />
      <SkeletonCard className="h-72" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonChart className="lg:col-span-2" />
        <SkeletonChart />
      </div>
    </div>
  );
}
