// Mock results: headlined by the PRC weighted average (what the verdict is
// judged on, and what Past sittings shows) and coloured by the VERDICT — it
// used to band on the raw score, so a 65% showed amber beside "FAILED". A
// battle still waiting on the others gets a proper waiting state (it rendered
// "%" and the raw word "GRADING"), weak topics open a drill, and the sitting
// links to its full review.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { expectNoSkippedLevels } from '../../test/headings';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../components/NotificationOptIn', () => ({ default: () => null }));
const fetchMockHistory = vi.fn(() => Promise.resolve([]));
vi.mock('../../services/dbQueries', async (importOriginal) => ({ ...(await importOriginal()), fetchMockHistory: (...a) => fetchMockHistory(...a) }));

const { default: SimulatorDiagnostics } = await import('./SimulatorDiagnostics');

describe('what comes next', () => {
  const QS = [
    { id: 'a', subject: 'EE', text: 'A?', options: ['1', '2'], answer: '1', userAnswer: '2', userConf: 'LOW' },
    { id: 'b', subject: 'EE', text: 'B?', options: ['1', '2'], answer: '1', userAnswer: '1' },
    { id: 'c', subject: 'EE', text: 'C?', options: ['1', '2'], answer: '1', userAnswer: null },
  ];
  const results = (engine, props = {}) => render(
    <MemoryRouter>
      <SimulatorDiagnostics session={{ ...session({ verdict: 'PASSED', score: 80, generalAverage: 80, sessionId: 's1' }), questions: QS }} engine={engine} {...props} />
    </MemoryRouter>,
  );
  const engine = () => ({ config: { timeLimitMins: 60 }, resetToSetup: vi.fn(), startSimulation: vi.fn() });

  it('retakes just the ones missed, without the old answers', () => {
    const e = engine();
    results(e);
    fireEvent.click(screen.getByRole('button', { name: /Retake missed \(2\)/ }));
    const cfg = e.startSimulation.mock.calls[0][0];
    expect(cfg).toMatchObject({ source: 'retake', count: 2, subject: 'EE', retake: { sourceSessionId: 's1' } });
    expect(cfg.retakeQuestions.map((q) => q.id)).toEqual(['a', 'c']);
    expect(cfg.retakeQuestions[0].userAnswer).toBeUndefined();
  });

  it('takes another from setup', () => {
    const e = engine();
    results(e);
    fireEvent.click(screen.getByRole('button', { name: 'Take another' }));
    expect(e.resetToSetup).toHaveBeenCalled();
  });

  it('a battle points to its room for places and a rematch, not a retake', () => {
    const e = { ...engine(), config: { battleId: 'ABC123' } };
    results(e, { isBattle: true });
    expect(screen.getByRole('link', { name: /Places and rematch/ })).toHaveAttribute('href', '/battle/ABC123');
    expect(screen.queryByRole('button', { name: /Retake missed/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Take another' })).toBeNull();
  });

  it('the full board’s last section has its own way out', () => {
    results(engine(), { onExit: vi.fn(), headingLevel: 2 });
    expect(screen.queryByRole('button', { name: 'Take another' })).toBeNull();
  });
});

describe('a sitting the clock submitted', () => {
  const show = (diagnostics) => render(
    <MemoryRouter><SimulatorDiagnostics session={session(diagnostics)} engine={{ resetToSetup: vi.fn() }} /></MemoryRouter>,
  );
  it('says time ran out', () => {
    show({ timedOut: true, verdict: 'PASSED', score: 80, generalAverage: 80 });
    expect(screen.getByText('Time ran out, so your answers were submitted.')).toBeInTheDocument();
  });
  it('says nothing when submitted by hand', () => {
    show({ verdict: 'PASSED', score: 80, generalAverage: 80 });
    expect(screen.queryByText(/Time ran out/)).toBeNull();
  });
});

const session = (diagnostics) => ({
  diagnostics: {
    totalItems: 100, correctItems: 75, timeTakenSecs: 3600, unansweredItems: 2,
    subjectScores: { Math: 40, ESAS: 90, EE: 85 },
    weakTopics: [], chronoAnomalies: [], blindSpots: [],
    ...diagnostics,
  },
  questions: [],
});

function PracticeProbe() {
  const loc = useLocation();
  return <p>practice with {loc.state?.preset?.drillTopic}</p>;
}

const renderIt = (d, props = {}) => render(
  <MemoryRouter initialEntries={['/simulator']}>
    <Routes>
      <Route path="/simulator" element={<SimulatorDiagnostics session={session(d)} engine={{ resetToSetup: vi.fn() }} {...props} />} />
      <Route path="/practice" element={<PracticeProbe />} />
    </Routes>
  </MemoryRouter>,
);

describe('SimulatorDiagnostics', () => {
  it('leads with the weighted average, coloured by the verdict, the raw score beside it', () => {
    renderIt({ score: 75, generalAverage: 76.25, verdict: 'CONDITIONAL PASS' });
    const headline = screen.getByText('76.3%');
    expect(headline.getAttribute('style')).toContain('var(--color-reeAmber-text)');
    expect(screen.getByText('General weighted average', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // the raw score tile
    expect(screen.getByText('CONDITIONAL PASS')).toBeInTheDocument();
  });

  it('colours a FAILED sitting red', () => {
    renderIt({ score: 65, generalAverage: 64.5, verdict: 'FAILED' });
    expect(screen.getByText('64.5%').getAttribute('style')).toContain('var(--accent-danger)');
  });

  it('has one heading at the page level', () => {
    renderIt({ score: 75, generalAverage: 76.25, verdict: 'PASSED' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  // Under the full-board result the title is an h2 ("Last section"), and its
  // sections were h2s beside it: a flat outline.
  it.each([1, 2])('at heading level %i, its sections sit one level below the title', (headingLevel) => {
    const pacingItems = [{ order: 1, subject: 'EE', timeSpentMs: 400_000, text: 'Slow one' }, { order: 2, subject: 'EE', timeSpentMs: 60_000, text: 'Quick one' }];
    const { container } = renderIt({ score: 75, generalAverage: 76.25, verdict: 'PASSED', pacingItems }, { headingLevel });
    const sections = screen.getAllByRole('heading', { level: headingLevel + 1 }).map((h) => h.textContent);
    expect(sections).toEqual(expect.arrayContaining(['By subject', 'Pacing', 'Weak topics']));
    expectNoSkippedLevels(container);
  });

  it('a battle waiting on someone who left says when the results are due, then offers to check', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const resultsBy = Date.now() + 120_000;
      const onCheckResults = vi.fn();
      renderIt({ pending: true, score: null, correctItems: null, resultsBy }, { isBattle: true, onCheckResults });
      const time = new Date(resultsBy).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      expect(screen.getByText(`Results by ${time} at the latest, even if someone has left.`)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Check for results' })).not.toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(121_000);
      fireEvent.click(await screen.findByRole('button', { name: 'Check for results' }));
      expect(onCheckResults).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a battle waiting on the others says so, with no score yet', () => {
    renderIt({ pending: true, score: null, verdict: null, correctItems: null }, { isBattle: true, submitPending: true });
    expect(screen.getByText('Waiting for the other players')).toBeInTheDocument();
    expect(screen.getByText(/Reconnecting to send your answers/)).toBeInTheDocument();
    expect(screen.queryByText('GRADING')).not.toBeInTheDocument();
    expect(screen.queryByText(/^%$/)).not.toBeInTheDocument();
  });

  it('opens a drill on a weak topic', () => {
    renderIt({ score: 50, generalAverage: 50, verdict: 'FAILED', weakTopics: ['Power Factor'], weakTopicDetails: [{ topic: 'Power Factor', subject: 'EE' }] });
    fireEvent.click(screen.getByRole('button', { name: /Drill/ }));
    expect(screen.getByText('practice with Power Factor')).toBeInTheDocument();
  });

  it('links to the full review of the sitting', () => {
    renderIt({ score: 80, generalAverage: 80, verdict: 'PASSED', sessionId: 'sess-42' });
    expect(screen.getByRole('link', { name: /Review every item/ })).toHaveAttribute('href', '/exams/sittings/sess-42');
  });
});

describe('the debrief: against the last sitting, and the two halves', () => {
  const blended = (id, date, generalAverage, subjectScores) => ({ id, date, kind: 'blended', isPrcStandard: false, targetSubject: 'BLENDED', score: 60, generalAverage, subjectScores });
  const history = [
    blended('now', '2026-11-14T02:00:00Z', 66.4, { Mathematics: 40, ESAS: 90, EE: 85 }),
    blended('before', '2026-11-03T02:00:00Z', 62.2, { Mathematics: 40, ESAS: 95, EE: 77 }),
  ];

  it('says how each subject and the average moved since the last sitting like it', async () => {
    fetchMockHistory.mockResolvedValueOnce(history);
    renderIt({ score: 66, generalAverage: 66.4, verdict: 'FAILED', sessionId: 'now' });
    expect(await screen.findByText('up 4.2 points overall')).toBeInTheDocument();
    expect(screen.getByText(/Against your last sitting like this, on Nov 3/)).toBeInTheDocument();
    expect(screen.getByText('Up 8 from last time')).toBeInTheDocument();
    expect(screen.getByText('Down 5 from last time')).toBeInTheDocument();
    expect(screen.getByText('Level from last time')).toBeInTheDocument();
  });

  it('a first sitting of its format, and a battle, compare with nothing', async () => {
    fetchMockHistory.mockResolvedValueOnce([history[0]]);
    const first = renderIt({ score: 66, generalAverage: 66.4, verdict: 'FAILED', sessionId: 'now' });
    await vi.waitFor(() => expect(fetchMockHistory).toHaveBeenCalled());
    expect(screen.queryByText(/Against your last sitting/)).toBeNull();
    first.unmount();

    fetchMockHistory.mockClear();
    renderIt({ score: 66, generalAverage: 66.4, verdict: 'FAILED', sessionId: 'now' }, { isBattle: true });
    expect(fetchMockHistory).not.toHaveBeenCalled();
  });

  it('says when the second half of the paper fell away', () => {
    const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, subject: 'EE', text: `Q${i}`, options: ['A', 'B'], answer: 'A', userAnswer: i < 8 || (i >= 10 && i < 15) ? 'A' : 'B' }));
    render(
      <MemoryRouter>
        <SimulatorDiagnostics session={{ ...session({ verdict: 'FAILED', score: 65, generalAverage: 65 }), questions }} engine={{ resetToSetup: vi.fn() }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Your second half was 30 points lower than your first (50% against 80%).')).toBeInTheDocument();
  });
});
