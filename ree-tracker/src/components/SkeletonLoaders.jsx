import { Grid, Page } from './ui';

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
      {/* Mirrors the real page: the header with its chips, then the Today
          card's three figures and its action rows, so nothing jumps on load. */}
      <div className="flex flex-col gap-2">
        <div className="skeleton-shimmer h-8 w-40 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-56 rounded" />
      </div>
      <div aria-hidden="true" className="rounded-[var(--radius-lg)] border border-border p-6 sm:p-8 flex flex-col gap-6">
        <div className="skeleton-shimmer h-7 w-72 max-w-full rounded-lg" />
        <Grid kind="cards" gap="lg" className="@2xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </Grid>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-14 rounded-[var(--radius-default)]" />
          ))}
        </div>
      </div>
    </Page>
  );
}
