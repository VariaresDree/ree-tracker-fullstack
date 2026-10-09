// Mock results: headlined by the PRC weighted average (what the verdict is
// judged on, and what Past sittings shows) and coloured by the VERDICT — it
// used to band on the raw score, so a 65% showed amber beside "FAILED". A
// battle still waiting on the others gets a proper waiting state (it rendered
// "%" and the raw word "GRADING"), weak topics open a drill, and the sitting
// links to its full review.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../components/NotificationOptIn', () => ({ default: () => null }));

const { default: SimulatorDiagnostics } = await import('./SimulatorDiagnostics');

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
