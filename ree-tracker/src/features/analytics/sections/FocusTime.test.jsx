// Progress › Habits › Focus time: minutes per day from the timer, and the split
// by subject beside the board's weights, naming the subject furthest behind.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let payload;
vi.mock('../useDeepAnalytics', () => ({ useDeepAnalytics: () => ({ status: 'ready', retry: vi.fn(), data: payload }) }));
const { default: FocusTime } = await import('./FocusTime');
const { focusGapLine } = await import('./focusGap');

const days = Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, minutes: i === 13 ? 50 : 0, bySubject: {} }));

describe('FocusTime', () => {
  it('shows the days and the split against the board', () => {
    payload = {
      days,
      last30: { minutes: 170, blocks: 5, bySubject: { General: 50 } },
      boardMinutes: 120,
      shares: [
        { subject: 'Mathematics', minutes: 90, share: 0.75, weight: 0.25 },
        { subject: 'ESAS', minutes: 0, share: 0, weight: 0.3 },
        { subject: 'EE', minutes: 30, share: 0.25, weight: 0.45 },
      ],
    };
    render(<FocusTime />);
    expect(screen.getByText('Focus minutes per day, last 14 days')).toBeInTheDocument();
    expect(screen.getByText('75% of your focus · 25% of the board')).toBeInTheDocument();
    expect(screen.getByText('ESAS is 30% of the board but 0% of your focus time.')).toBeInTheDocument();
    expect(screen.getByText(/marked General, not counted in the split/)).toBeInTheDocument();
  });

  it('explains how to start when there are no blocks yet', () => {
    payload = { days, last30: { minutes: 0, blocks: 0, bySubject: {} }, boardMinutes: 0, shares: [] };
    render(<FocusTime />);
    expect(screen.getByText(/Start a focus block on the timer/)).toBeInTheDocument();
  });

  it('says nothing about the split when it is close to the board', () => {
    expect(focusGapLine([{ subject: 'EE', share: 0.4, weight: 0.45 }, { subject: 'ESAS', share: 0.3, weight: 0.3 }])).toBeNull();
  });
});

describe('RecentFocusBlocks', () => {
  it('fixes a block and deletes another, then reloads', async () => {
    const { fireEvent, waitFor } = await import('@testing-library/react');
    const apiRequest = vi.fn().mockResolvedValue({ success: true });
    vi.doMock('../../../services/dbQueries', () => ({ apiRequest }));
    vi.resetModules();
    const { default: RecentFocusBlocks } = await import('./RecentFocusBlocks');
    const onChanged = vi.fn();
    const blocks = [
      { id: 'b1', subject: 'EE', minutes: 25, endedAt: '2026-10-12T02:00:00Z', maxMinutes: 31 },
      { id: 'b2', subject: 'ESAS', minutes: 10, endedAt: '2026-10-11T02:00:00Z', maxMinutes: 12 },
    ];
    render(<RecentFocusBlocks blocks={blocks} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit the EE block/ }));
    fireEvent.change(screen.getByLabelText('What this block was for'), { target: { value: 'Mathematics' } });
    fireEvent.change(screen.getByLabelText('Focus minutes, up to 31'), { target: { value: '40' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Focus minutes, up to 31'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/user/focus-blocks/b1', 'PATCH', { subject: 'Mathematics', minutes: 20 }));

    fireEvent.click(screen.getByRole('button', { name: /Delete the ESAS block/ }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/user/focus-blocks/b2', 'DELETE'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));
  });
});
