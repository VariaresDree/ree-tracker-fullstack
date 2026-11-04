// src/features/exams/SavedRunCard.jsx
//
// An unfinished run, at the top of its Exams tab, one tap from going back in.
import { Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui';

export default function SavedRunCard({ title, summary, to, action = 'Resume' }) {
  return (
    <Card
      padding="sm"
      className="flex flex-wrap items-center gap-3"
      role="region"
      aria-label={title}
      style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)' }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-textMain">{title}</p>
        <p className="text-xs text-muted2 tabular-nums">{summary}</p>
      </div>
      <Button size="sm" tone="amber" as={Link} to={to}>{action}</Button>
    </Card>
  );
}
