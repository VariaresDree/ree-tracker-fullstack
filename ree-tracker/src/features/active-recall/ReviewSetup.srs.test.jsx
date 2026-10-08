// The spaced-review entry point on the setup screen.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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
    render(<MemoryRouter><ReviewSetup {...props} /></MemoryRouter>);

    expect(await screen.findByText('42 questions due for review')).toBeInTheDocument();
    expect(screen.getByText(/5 overdue/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review 30 now' }));
    expect(props.startSession).toHaveBeenCalledWith(expect.objectContaining({ source: 'srs-due', count: 30, subject: 'All' }));
  });

  it('says when the next review is due once the queue is clear', async () => {
    const tomorrow = new Date(Date.now() + 20 * 3600 * 1000).toISOString();
    fetchSrsSummary.mockResolvedValue({ due: 0, overdue: 0, total: 8, bySubject: {}, nextDueAt: tomorrow });
    render(<MemoryRouter><ReviewSetup {...baseProps()} /></MemoryRouter>);
    expect(await screen.findByText('Review queue is clear')).toBeInTheDocument();
    expect(screen.getByText(/Next review tomorrow/)).toBeInTheDocument();
  });

  it('shows nothing before any card exists, and never asks while offline', async () => {
    fetchSrsSummary.mockResolvedValue({ due: 0, overdue: 0, total: 0, bySubject: {}, nextDueAt: null });
    render(<MemoryRouter><ReviewSetup {...baseProps()} /></MemoryRouter>);
    await waitFor(() => expect(fetchSrsSummary).toHaveBeenCalled());
    expect(screen.queryByText(/due for review|queue is clear/)).not.toBeInTheDocument();

    fetchSrsSummary.mockClear();
    render(<MemoryRouter><ReviewSetup {...baseProps()} isOnline={false} /></MemoryRouter>);
    expect(fetchSrsSummary).not.toHaveBeenCalled();
  });
});

describe('ReviewSetup — presets and the custom form', () => {
  beforeEach(() => {
    fetchSrsSummary.mockResolvedValue({ due: 0, overdue: 0, total: 0, bySubject: {}, nextDueAt: null });
  });

  it('four presets: Quick 20, Weak spots (the adaptive drill), Flashcards, Bookmarks', () => {
    const props = baseProps();
    render(<MemoryRouter><ReviewSetup {...props} /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Practice' })).toBeInTheDocument();
    const names = ['Quick 20', 'Weak spots', 'Flashcards', 'Bookmarks'];
    names.forEach((n) => expect(screen.getByText(n)).toBeInTheDocument());

    const starts = screen.getAllByRole('button', { name: 'Start' });
    fireEvent.click(starts[1]);
    expect(props.startSession).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'smart-drill', drillTopic: null, count: 20 }));
    fireEvent.click(starts[3]);
    expect(props.startSession).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'bookmarks', count: 20 }));
  });

  it('offline, the drill and bookmarks presets say they need a connection', () => {
    render(<MemoryRouter><ReviewSetup {...baseProps()} isOnline={false} /></MemoryRouter>);
    expect(screen.getAllByText('Needs a connection')).toHaveLength(2);
  });

  it('the custom form has one way to drill: none. Scope is all, one subject or one topic', () => {
    render(<MemoryRouter><ReviewSetup {...baseProps()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Custom session/ }));
    expect(screen.queryByRole('radio', { name: 'Weak points' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Smart drill/ })).not.toBeInTheDocument();
    ['All subjects', 'One subject', 'One topic', 'Question bank', 'My bookmarks', 'AI generated']
      .forEach((n) => expect(screen.getByRole('radio', { name: new RegExp(n) })).toBeInTheDocument());
  });

  it('a drill left in the form shows, and starts, as a question-bank session over every subject', () => {
    const props = baseProps();
    props.config = { ...props.config, studyMode: 'bleeding', source: 'smart-drill', subject: 'EE', drillTopic: 'Protection' };
    render(<MemoryRouter><ReviewSetup {...props} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Custom session/ }));
    expect(screen.getByRole('radio', { name: 'All subjects' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Question bank' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
    expect(props.startSession).toHaveBeenCalledWith(expect.objectContaining({ source: 'library', studyMode: 'interleaved', subject: 'All' }));
  });

  it('choosing one subject keeps the chosen source', () => {
    const props = baseProps();
    props.config = { ...props.config, source: 'bookmarks' };
    render(<MemoryRouter><ReviewSetup {...props} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Custom session/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'One subject' }));
    expect(props.setConfig).toHaveBeenCalledWith(expect.objectContaining({ studyMode: 'subject', subject: 'Mathematics', source: 'bookmarks' }));
  });
});
