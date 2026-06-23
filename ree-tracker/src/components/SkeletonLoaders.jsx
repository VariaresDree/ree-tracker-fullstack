import React from 'react';

export function SkeletonCard({ className = '' }) {
  return <div className={`skeleton-shimmer h-32 rounded-xl ${className}`} />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton-shimmer h-3 rounded" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}

export function SkeletonChart({ className = '' }) {
  return <div className={`skeleton-shimmer h-[350px] rounded-xl ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 page-fade-in">
      <div className="skeleton-shimmer h-8 w-64 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}
