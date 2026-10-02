// The spaced-review entry point on the setup screen.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fetchSrsSummary = vi.fn();
vi.mock('../../services/dbQueries', () => ({ fetchSrsSummary: (...a) => fetchSrsSummary(...a) }));

const { default: ReviewSetup } = await import('./ReviewSetup');
const { __resetSrsSummaryInFlight } = await import('../../hooks/useSrsSummary');

const baseProps = () => ({
  config: { sessionMode: 'mcq', studyMode: 'interleaved', subject: 'All', subtopic: 'All', cognitiveFocus: 'mixed', count: 20, source: 'library' },
  setConfig: vi.fn(),
  session: { loading: false },
  safeTOS: {},
  isOnline: true,
  startSession: vi.fn(),
});

beforeEach(() => {
  fetchSrsSummary.mockReset();
  __resetSrsSummaryInFlight();
});

describe('ReviewSetup — due for review', () => {
  it('offers the due queue as a session, capped at 30', async () => {
    fetchSrsSummary.mockResolvedValue({ due: 42, overdue: 5, total: 60, bySubject: {}, nextDueAt: null });
    const props = baseProps();
    render(<ReviewSetup {...props} />);

    expect(await screen.findByText('42 questions due for review')).toBeInTheDocument();
    expect(screen.getByText(/5 overdue/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review 30 now' }));
    expect(props.startSession).toHaveBeenCalledWith(expect.objectContaining({ source: 'srs-due', count: 30, subject: 'All' }));
  });

  it('says when the next review is due once the queue is clear', async () => {
    const tomorrow = new Date(Date.now() + 20 * 3600 * 1000).toISOString();
    fetchSrsSummary.mockResolvedValue({ due: 0, overdue: 0, total: 8, bySubject: {}, nextDueAt: tomorrow });
    render(<ReviewSetup {...baseProps()} />);
    expect(await screen.findByText('Review queue is clear')).toBeInTheDocument();
    expect(screen.getByText(/Next review tomorrow/)).toBeInTheDocument();
  });

  it('shows nothing before any card exists, and never asks while offline', async () => {
    fetchSrsSummary.mockResolvedValue({ due: 0, overdue: 0, total: 0, bySubject: {}, nextDueAt: null });
    render(<ReviewSetup {...baseProps()} />);
    await waitFor(() => expect(fetchSrsSummary).toHaveBeenCalled());
    expect(screen.queryByText(/due for review|queue is clear/)).not.toBeInTheDocument();

    fetchSrsSummary.mockClear();
    render(<ReviewSetup {...baseProps()} isOnline={false} />);
    expect(fetchSrsSummary).not.toHaveBeenCalled();
  });
});
