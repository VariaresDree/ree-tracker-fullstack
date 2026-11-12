import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ScheduledJobs from './ScheduledJobs';

// Admin › App health › Scheduled jobs: each job's last run, what it did, and a
// warning when it is late or failed.

const run = (over) => ({ startedAt: '2026-11-12T13:05:00Z', durationMs: 800, ok: true, summary: null, error: null, ...over });
const rowOf = (name) => screen.getByText(name).closest('li');

describe('Scheduled jobs', () => {
  it('says what each run did, on time', () => {
    render(<ScheduledJobs jobs={[
      { job: 'reminders', last: run({ summary: { candidates: 3, sent: 2, quiet: 1 } }), runs24h: 9, failed24h: 0, late: false },
      { job: 'subtopic-tags', last: run({ summary: { batches: 3, saved: 120, queued: 30, done: false } }), runs24h: 1, failed24h: 0, late: false },
    ]} />);
    const reminders = within(rowOf('Daily reminders'));
    expect(reminders.getByText('On time')).toBeInTheDocument();
    expect(reminders.getByText('3 due that hour: 2 sent, 1 with nothing to say.')).toBeInTheDocument();
    expect(reminders.getByText('9 runs in the last day')).toBeInTheDocument();
    expect(within(rowOf('Subtopic tagging')).getByText('3 batches: 120 tagged, 30 to review.')).toBeInTheDocument();
  });

  it('flags a failed run with its error, a late job, and one never run', () => {
    render(<ScheduledJobs jobs={[
      { job: 'reminders', last: run({ ok: false, error: 'Reminders run failed.' }), runs24h: 2, failed24h: 2, late: true },
      { job: 'subtopic-tags', last: null, runs24h: 0, failed24h: 0, late: true },
    ]} />);
    const reminders = within(rowOf('Daily reminders'));
    expect(reminders.getByText('Failed')).toBeInTheDocument();
    expect(reminders.getByText('Reminders run failed.')).toBeInTheDocument();
    expect(reminders.getByText('2 runs in the last day, 2 failed')).toBeInTheDocument();
    const tags = within(rowOf('Subtopic tagging'));
    expect(tags.getByText('No run yet')).toBeInTheDocument();
    expect(tags.getByText(/once the Supabase jobs are set up/)).toBeInTheDocument();
  });

  it('a tagging run that was off, or cut short by the AI, says so', () => {
    render(<ScheduledJobs jobs={[
      { job: 'subtopic-tags', last: run({ summary: { skipped: 'off' } }), runs24h: 1, failed24h: 0, late: false },
    ]} />);
    expect(screen.getByText('Off: switch it on in Question bank › Subtopics.')).toBeInTheDocument();
  });

  it('shows nothing before the server sends any jobs (an older server)', () => {
    const { container } = render(<ScheduledJobs jobs={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
