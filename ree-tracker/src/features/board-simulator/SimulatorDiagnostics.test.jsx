// The results hero is coloured by the VERDICT. It used to band on the raw score
// (>= 70 green, >= 60 amber), so a 65% sitting showed amber beside "FAILED"
// and a 75% with a subject under 50% showed green beside "CONDITIONAL PASS".
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));

const { default: SimulatorDiagnostics } = await import('./SimulatorDiagnostics');

const session = (diagnostics) => ({
  diagnostics: {
    totalItems: 100, correctItems: 75, timeTakenSecs: 3600,
    subjectScores: { Math: 40, ESAS: 90, EE: 85 },
    weakTopics: [], chronoAnomalies: [], blindSpots: [],
    ...diagnostics,
  },
  questions: [],
});

const renderIt = (d) => render(
  <MemoryRouter><SimulatorDiagnostics session={session(d)} setSession={() => {}} /></MemoryRouter>,
);

describe('SimulatorDiagnostics', () => {
  it('colours a 75% CONDITIONAL PASS amber, not green', () => {
    renderIt({ score: 75, generalAverage: 76.25, verdict: 'CONDITIONAL PASS' });
    const verdict = screen.getByText('CONDITIONAL PASS');
    // The text form of amber: it reads at 4.5:1 in every theme.
    expect(verdict.getAttribute('style')).toContain('var(--color-reeAmber-text)');
  });

  it('colours a 65% FAILED red, not amber', () => {
    renderIt({ score: 65, generalAverage: 64.5, verdict: 'FAILED' });
    expect(screen.getByText('FAILED').getAttribute('style')).toContain('var(--accent-danger)');
  });

  it('shows the general weighted average the verdict was judged on', () => {
    renderIt({ score: 75, generalAverage: 76.25, verdict: 'CONDITIONAL PASS' });
    expect(screen.getByText(/General weighted average/)).toHaveTextContent('76.3%');
  });
});
