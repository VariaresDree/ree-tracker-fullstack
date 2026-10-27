import { Card, Grid, Page } from './ui';

// Pure-decoration placeholders — hidden from assistive tech; the parent
// container carries the single role="status" loading announcement.
export function SkeletonCard({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton-shimmer h-32 rounded-[var(--radius-lg)] ${className}`} />;
}

// `className` sets the height (default 350px): a chart panel passes its own,
// so the placeholder fills the panel instead of spilling out of it.
export function SkeletonChart({ className = 'h-[350px]' }) {
  return <div aria-hidden="true" className={`skeleton-shimmer rounded-[var(--radius-lg)] ${className}`} />;
}

export function TodaySkeleton() {
  return (
    <Page role="status" aria-live="polite" aria-label="Loading Today">
      {/* Mirrors the real page, so nothing jumps on load: the header with its
          chips, the "Up next" hero, the three tiles, and the "Also today"
          rows. */}
      <div className="flex flex-col gap-2">
        <div className="skeleton-shimmer h-8 w-40 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-56 rounded" />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Card variant="hero" className="flex flex-col gap-3">
          <div className="skeleton-shimmer h-3 w-16" />
          <div className="skeleton-shimmer h-7 w-72 max-w-full" />
          <div className="skeleton-shimmer h-4 w-full max-w-prose" />
          <div className="skeleton-shimmer h-11 w-full sm:w-32 mt-2" />
        </Card>
        <Grid kind="cards" className="@2xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-40" />
          ))}
        </Grid>
        <Card padding="md" className="flex flex-col gap-3">
          <div className="skeleton-shimmer h-5 w-28" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-14" />
          ))}
        </Card>
      </div>
    </Page>
  );
}
