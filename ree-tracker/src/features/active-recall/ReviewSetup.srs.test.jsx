// The spaced-review entry point on the setup screen.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const fetchSrsSummary = vi.fn();
vi.mock('../../services/dbQueries', () => ({ fetchSrsSummary: (...a) => fetchSrsSummary(...a) }));

const { default: ReviewSetup } = await import('./ReviewSetup');
const { __resetSrsSummaryInFlight } = await import('../../hooks/useSrsSummary');

// Stands in for the phone's Back button.
function BackButton() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>device-back</button>;
}

const baseProps = () => ({
  config: { sessionMode: 'mcq', studyMode: 'interleaved', subject: 'All', subtopic: 'All', cognitiveFocus: 'mixed', count: 20, source: 'library' },
  session: { loading: false },
  safeTOS: { Mathematics: ['Algebra', 'Calculus'], ESAS: ['Chemistry'], EE: ['Circuits', 'Machines'] },
  isOnline: true,
  startSession: vi.fn(),
});

beforeEach(() => {
  localStorage.clear();
  fetchSrsSummary.mockReset();
  __resetSrsSummaryInFlight();
});

describe('ReviewSetup — due for review', () => {
  it('leads with the due queue as a session, capped at 30, and keeps every preset below it', async () => {
    fetchSrsSummary.mockResolvedValue({ due: 42, overdue: 5, total: 60, bySubject: {}, nextDueAt: null });
    const props = baseProps();
    render(<MemoryRouter><ReviewSetup {...props} /></MemoryRouter>);

    expect(await screen.findByRole('heading', { level: 2, name: '42 questions due for review' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Start (Quick 20|Adaptive set|Weak spots|Flashcards|Bookmarks)$/ })).toHaveLength(5);
    expect(screen.getByText(/5 overdue/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review 30 now' }));
    expect(props.startSession).toHaveBeenCalledWith(expect.objectContaining({ source: 'srs-due', count: 30, subject: 'All' }));
  });

  it('asks for 30 a day and says how many wait for later days', async () => {
    fetchSrsSummary.mockResolvedValue({ due: 30, later: 139, overdue: 160, total: 200, bySubject: {}, nextDueAt: null });
    render(<MemoryRouter><ReviewSetup {...baseProps()} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 2, name: '30 questions due for review' })).toBeInTheDocument();
    expect(screen.getByText(/At most 30 a day: 139 more wait for later days./)).toBeInTheDocument();
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

describe('ReviewSetup — presets', () => {
  beforeEach(() => {
    fetchSrsSummary.mockResolvedValue({ due: 0, overdue: 0, total: 0, bySubject: {}, nextDueAt: null });
  });

  it('five presets: Quick 20 leads when nothing is due, and a tap on a tile starts its session', async () => {
    const props = baseProps();
    render(<MemoryRouter><ReviewSetup {...props} /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Practice' })).toBeInTheDocument();
    // The hero waits for the review queue, then holds Quick 20.
    expect(screen.getByLabelText('Checking your review queue')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Quick 20' })).toBeInTheDocument();
    // Offered once: in the hero, not again in the grid.
    expect(screen.getAllByText('Quick 20')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Start Adaptive set' }));
    expect(props.startSession).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'adaptive', subject: 'All', count: 20 }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Weak spots' }));
    expect(props.startSession).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'smart-drill', drillTopic: null, count: 20 }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Flashcards' }));
    expect(props.startSession).toHaveBeenLastCalledWith(expect.objectContaining({ sessionMode: 'flashcard', cognitiveFocus: 'conceptual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Bookmarks' }));
    expect(props.startSession).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'bookmarks', count: 20 }));
    // No separate Start button in a tile.
    expect(screen.queryByRole('button', { name: /^Start$/ })).toHaveTextContent('Start');
    expect(screen.getAllByRole('button', { name: /^Start$/ })).toHaveLength(1);
  });

  it('points a learner who is unsure where to start at the placement test', () => {
    render(<MemoryRouter><ReviewSetup {...baseProps()} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Take the placement test' })).toHaveAttribute('href', '/diagnostic');
  });

  it('offline, every tile can start, and Quick 20 leads at once', () => {
    const props = baseProps();
    render(<MemoryRouter><ReviewSetup {...props} isOnline={false} /></MemoryRouter>);
    expect(screen.queryByText('Needs a connection')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Weak spots' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Start Bookmarks' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Start Flashcards' })).toBeEnabled();
    // No queue to wait for offline.
    expect(screen.getByRole('heading', { level: 2, name: 'Quick 20' })).toBeInTheDocument();
  });
});

describe('ReviewSetup — Build your own', () => {
  const card = () => screen.getByRole('button', { name: 'Build your own' });
  const builder = () => within(screen.getByRole('dialog', { name: 'Build your own' }));
  const show = (props = baseProps()) => {
    render(<MemoryRouter><ReviewSetup {...props} /><BackButton /></MemoryRouter>);
    fireEvent.click(card());
    return props;
  };
  // Starts it, says what started, and opens the sheet again for the next step.
  const started = (props) => {
    fireEvent.click(builder().getByRole('button', { name: 'Start session' }));
    fireEvent.click(card());
    return props.startSession.mock.calls.at(-1)[0];
  };

  beforeEach(() => {
    fetchSrsSummary.mockResolvedValue({ due: 0, overdue: 0, total: 0, bySubject: {}, nextDueAt: null });
  });

  it('is a hero card in its place on the page, and the setup waits in a sheet', () => {
    render(<MemoryRouter><ReviewSetup {...baseProps()} /></MemoryRouter>);
    const heroCard = screen.getByRole('region', { name: 'Build your own' });
    expect(heroCard.className).toMatch(/card-hero/);
    expect(within(heroCard).getByText('20 choice · all subjects · mixed')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Subject' })).not.toBeInTheDocument();
    expect(card()).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(card());
    expect(builder().getByRole('radiogroup', { name: 'Subject' })).toBeInTheDocument();
  });

  it('asks no question about scope', () => {
    show();
    expect(screen.queryByRole('button', { name: /Custom session/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Study scope' })).not.toBeInTheDocument();
    ['All', 'Math', 'ESAS', 'EE', '10', '100', 'Mixed', 'Theory', 'Calculation', 'Choice', 'Cards', 'Bank', 'Saved', 'AI']
      .forEach((name) => expect(builder().getByRole('radio', { name })).toBeInTheDocument());
    // One way to drill: the Weak spots tile.
    expect(screen.queryByRole('radio', { name: /Weak points|Smart drill/ })).not.toBeInTheDocument();
  });

  it('Back closes the sheet, and the card shows what was set', () => {
    show();
    fireEvent.click(builder().getByRole('radio', { name: 'EE' }));
    fireEvent.click(screen.getByText('device-back'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Build your own' })).getByText('20 choice · EE · mixed')).toBeInTheDocument();
  });

  it('a link opens the sheet, and closing stays on the page', () => {
    render(<MemoryRouter initialEntries={['/practice?build=1']}><ReviewSetup {...baseProps()} /></MemoryRouter>);
    fireEvent.click(builder().getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(card()).toBeInTheDocument();
  });

  it('Start closes the sheet and starts the session', () => {
    const props = show();
    fireEvent.click(builder().getByRole('button', { name: 'Start session' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(props.startSession).toHaveBeenCalledTimes(1);
  });

  it('while a session is starting, the card says so and doesn’t open', () => {
    render(<MemoryRouter><ReviewSetup {...baseProps()} session={{ loading: true }} /></MemoryRouter>);
    expect(card()).toBeDisabled();
    expect(screen.getByText('Starting…')).toBeInTheDocument();
  });

  it('All subjects has no topic to pick, and starts across every subject', () => {
    const props = show();
    expect(screen.queryByLabelText('Topic')).not.toBeInTheDocument();
    expect(started(props)).toMatchObject({ studyMode: 'interleaved', subject: 'All', subtopic: 'All' });
  });

  it('a subject covers all its topics until one is picked, and back', () => {
    const props = show();
    fireEvent.click(builder().getByRole('radio', { name: 'EE' }));
    expect(builder().getByLabelText('Topic')).toHaveValue('All');
    expect(started(props)).toMatchObject({ studyMode: 'subject', subject: 'EE', subtopic: 'All' });

    fireEvent.change(builder().getByLabelText('Topic'), { target: { value: 'Machines' } });
    expect(started(props)).toMatchObject({ studyMode: 'subtopic', subject: 'EE', subtopic: 'Machines' });

    fireEvent.change(builder().getByLabelText('Topic'), { target: { value: 'All' } });
    expect(started(props)).toMatchObject({ studyMode: 'subject', subject: 'EE', subtopic: 'All' });
  });

  it('changing subject clears the topic', () => {
    const props = show();
    fireEvent.click(builder().getByRole('radio', { name: 'EE' }));
    fireEvent.change(builder().getByLabelText('Topic'), { target: { value: 'Machines' } });
    fireEvent.click(builder().getByRole('radio', { name: 'ESAS' }));
    expect(started(props)).toMatchObject({ studyMode: 'subject', subject: 'ESAS', subtopic: 'All' });
  });

  it('the summary line says what will start, and the choices keep each other', () => {
    const props = show();
    expect(builder().getByText('20 choice · all subjects · mixed')).toBeInTheDocument();
    fireEvent.click(builder().getByRole('radio', { name: 'EE' }));
    fireEvent.click(builder().getByRole('radio', { name: '50' }));
    fireEvent.click(builder().getByRole('radio', { name: 'Theory' }));
    fireEvent.click(builder().getByRole('radio', { name: 'Cards' }));
    fireEvent.click(builder().getByRole('radio', { name: 'Saved' }));
    expect(builder().getByText('50 cards · EE · theory · saved')).toBeInTheDocument();
    expect(started(props)).toMatchObject({ subject: 'EE', count: 50, cognitiveFocus: 'conceptual', sessionMode: 'flashcard', source: 'bookmarks' });
  });

  it('a drill left in the form shows, and starts, as a question-bank session over every subject', () => {
    const props = baseProps();
    props.config = { ...props.config, studyMode: 'bleeding', source: 'smart-drill', subject: 'EE', drillTopic: 'Protection' };
    show(props);
    expect(builder().getByRole('radio', { name: 'All' })).toBeChecked();
    expect(builder().getByRole('radio', { name: 'Bank' })).toBeChecked();
    expect(started(props)).toMatchObject({ source: 'library', studyMode: 'interleaved', subject: 'All' });
  });

  it('offline, it can draw from the bank or your bookmarks, but not AI', () => {
    show({ ...baseProps(), isOnline: false });
    expect(builder().getByRole('radio', { name: /Saved/ })).toBeEnabled();
    expect(builder().getByRole('radio', { name: /AI/ })).toBeDisabled();
    expect(builder().getByRole('button', { name: 'Start session' })).toBeEnabled();
  });

  it('a source that needs a connection, remembered offline, can’t start', () => {
    localStorage.setItem('ree:practice-builder', JSON.stringify({ studyMode: 'interleaved', subject: 'All', subtopic: 'All', sessionMode: 'mcq', cognitiveFocus: 'mixed', count: 20, source: 'ai' }));
    show({ ...baseProps(), isOnline: false });
    expect(builder().getByRole('button', { name: 'Start session' })).toBeDisabled();
  });

  describe('remembers the last setup on this device', () => {
    it('comes back as it was left, whatever a preset did in between', () => {
      const { unmount } = render(<MemoryRouter><ReviewSetup {...baseProps()} /></MemoryRouter>);
      fireEvent.click(card());
      fireEvent.click(builder().getByRole('radio', { name: 'EE' }));
      fireEvent.change(builder().getByLabelText('Topic'), { target: { value: 'Machines' } });
      fireEvent.click(builder().getByRole('radio', { name: '100' }));
      unmount();
      const props = baseProps();
      props.config = { ...props.config, studyMode: 'bleeding', source: 'smart-drill' }; // a preset's leftovers
      render(<MemoryRouter><ReviewSetup {...props} /></MemoryRouter>);
      expect(screen.getByText('100 choice · Machines · mixed')).toBeInTheDocument();
      fireEvent.click(card());
      expect(builder().getByLabelText('Topic')).toHaveValue('Machines');
    });

    it('a topic retired since falls back to its whole subject', () => {
      localStorage.setItem('ree:practice-builder', JSON.stringify({ studyMode: 'subtopic', subject: 'EE', subtopic: 'Gone', sessionMode: 'mcq', cognitiveFocus: 'mixed', count: 20, source: 'library' }));
      const props = show();
      expect(builder().getByLabelText('Topic')).toHaveValue('All');
      expect(started(props)).toMatchObject({ studyMode: 'subject', subject: 'EE', subtopic: 'All' });
    });

    it('a broken saved copy is ignored', () => {
      localStorage.setItem('ree:practice-builder', '{not json');
      show();
      expect(builder().getByRole('radio', { name: 'All' })).toBeChecked();
    });
  });
});

// 2026-11-13: "No bookmarks yet" and the like were a toast that faded,
// leaving the learner on setup with no reason and nothing to tap.
describe('ReviewSetup — nothing to practise', () => {
  it('says so in place, with Quick 20 to start instead', async () => {
    fetchSrsSummary.mockResolvedValue({ due: 0, overdue: 0, total: 0, bySubject: {}, nextDueAt: null });
    const props = { ...baseProps(), session: { loading: false, emptyMessage: 'No bookmarks yet. Tap the bookmark icon on a question to save it for later.' } };
    render(<MemoryRouter><ReviewSetup {...props} /></MemoryRouter>);
    const box = screen.getAllByRole('status').find((el) => el.textContent.includes('No bookmarks yet'));
    expect(box).toBeTruthy();
    fireEvent.click(within(box).getByRole('button', { name: 'Start Quick 20' }));
    expect(props.startSession).toHaveBeenCalledWith(expect.objectContaining({ source: 'library', count: 20 }));
  });
});
