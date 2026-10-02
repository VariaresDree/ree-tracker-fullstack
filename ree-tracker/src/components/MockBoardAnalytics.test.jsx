// Mock history comes from the server, headlines the PRC weighted average, and
// "removing" a sitting hides it — it never deletes the answers behind it.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('recharts', () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    ComposedChart: Stub, Line: () => null, Bar: () => null, XAxis: () => null, YAxis: () => null,
    CartesianGrid: () => null, Tooltip: () => null, Legend: () => null, ResponsiveContainer: Stub,
    ReferenceLine: () => null, Cell: () => null,
  };
});
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'user-hist' } }) }));

const fetchMockHistory = vi.fn();
const hideExamSession = vi.fn();
vi.mock('../services/dbQueries', () => ({
  fetchMockHistory: (...a) => fetchMockHistory(...a),
  hideExamSession: (...a) => hideExamSession(...a),
}));
const purgeSimulationLedger = vi.fn().mockResolvedValue();
vi.mock('../services/simulationLedger', () => ({
  purgeSimulationLedger: (...a) => purgeSimulationLedger(...a),
  dropLegacyLedger: vi.fn().mockResolvedValue(),
}));

const { default: MockBoardAnalytics } = await import('./MockBoardAnalytics');

const ROWS = [
  { id: 's1', date: '2026-10-01T03:00:00Z', mode: 'BOARD_SIM', kind: 'blended', score: 72, generalAverage: 69.3, verdict: 'FAILED', totalQuestions: 100, targetSubject: 'BLENDED', subjectScores: { Mathematics: 90, ESAS: 60, EE: 64 } },
  { id: 'b1', date: '2026-09-28T03:00:00Z', mode: 'BATTLE', kind: 'battle', score: 80, generalAverage: null, verdict: 'PASSED', totalQuestions: 10, targetSubject: 'EE', subjectScores: {} },
];

beforeEach(() => {
  fetchMockHistory.mockReset();
  hideExamSession.mockReset();
  purgeSimulationLedger.mockClear();
});

describe('MockBoardAnalytics', () => {
  it('lists server sittings, headlined by the weighted average, and retires the local ledger', async () => {
    fetchMockHistory.mockResolvedValue(ROWS);
    render(<MockBoardAnalytics />);
    expect((await screen.findAllByText('Full blended')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Battle').length).toBeGreaterThan(0);
    expect(screen.getAllByText('69%').length).toBeGreaterThan(0); // GWA 69.3, not the raw 72
    expect(screen.queryByText('72%')).not.toBeInTheDocument();
    await waitFor(() => expect(purgeSimulationLedger).toHaveBeenCalledWith('user-hist'));
  });

  it('"Remove" hides the sitting instead of deleting its answers', async () => {
    fetchMockHistory.mockResolvedValue(ROWS);
    hideExamSession.mockResolvedValue({ success: true });
    render(<MockBoardAnalytics />);
    const [firstRemove] = await screen.findAllByRole('button', { name: 'Remove from history' });
    fireEvent.click(firstRemove);
    expect(await screen.findByText(/still count toward your analytics/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(hideExamSession).toHaveBeenCalledTimes(1));
    expect(['s1', 'b1']).toContain(hideExamSession.mock.calls[0][0]);
  });
});
