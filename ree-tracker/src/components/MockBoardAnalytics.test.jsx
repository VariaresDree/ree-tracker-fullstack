// Mock history comes from the server, headlines the PRC weighted average, and
// "removing" a sitting hides it — it never deletes the answers behind it.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Rows link to their review page, so the list renders inside a router.
const render = (ui) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

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
const { forgetMockHistory } = await import('../services/mockHistoryCache');

const ROWS = [
  { id: 's1', date: '2026-10-01T03:00:00Z', mode: 'BOARD_SIM', kind: 'blended', score: 72, generalAverage: 69.3, verdict: 'FAILED', totalQuestions: 100, targetSubject: 'BLENDED', subjectScores: { Mathematics: 90, ESAS: 60, EE: 64 } },
  { id: 'b1', date: '2026-09-28T03:00:00Z', mode: 'BATTLE', kind: 'battle', score: 80, generalAverage: null, verdict: 'PASSED', totalQuestions: 10, targetSubject: 'EE', subjectScores: {} },
];

beforeEach(() => {
  forgetMockHistory();
  fetchMockHistory.mockReset();
  hideExamSession.mockReset();
  purgeSimulationLedger.mockClear();
});

describe('MockBoardAnalytics', () => {
  it('lists server sittings, headlined by the weighted average, and retires the local ledger', async () => {
    fetchMockHistory.mockResolvedValue(ROWS);
    render(<MockBoardAnalytics />);
    // The format names the learner chose ("Mixed paper"), not "Full blended".
    expect((await screen.findAllByText('Mixed paper')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Battle').length).toBeGreaterThan(0);
    // GWA 69.3 to one decimal — rounded, it read "70%" beside Failed — never the raw 72.
    expect(screen.getAllByText('69.3%').length).toBeGreaterThan(0);
    expect(screen.queryByText('72%')).not.toBeInTheDocument();
    expect(screen.queryByText('70%')).not.toBeInTheDocument();
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

  it('links every sitting to its review', async () => {
    fetchMockHistory.mockResolvedValue(ROWS);
    render(<MockBoardAnalytics />);
    const links = await screen.findAllByRole('link', { name: /Review the/ });
    expect(links.map((a) => a.getAttribute('href'))).toEqual(expect.arrayContaining(['/exams/sittings/s1', '/exams/sittings/b1']));
  });

  it('asks the server again on every visit, so a sitting just finished is listed', async () => {
    fetchMockHistory.mockResolvedValueOnce(ROWS);
    const first = render(<MockBoardAnalytics />);
    await screen.findAllByText('Mixed paper');
    first.unmount();
    const fresh = { ...ROWS[0], id: 's9', kind: 'full-board', generalAverage: 74.2, verdict: 'PASSED' };
    fetchMockHistory.mockResolvedValueOnce([fresh, ...ROWS]);
    render(<MockBoardAnalytics />);
    expect((await screen.findAllByText('Full PRC board')).length).toBeGreaterThan(0);
    expect(fetchMockHistory).toHaveBeenCalledTimes(2);
  });

  it('says it couldn’t load, instead of "no mock boards yet"', async () => {
    fetchMockHistory.mockRejectedValue(new Error('[OFFLINE]'));
    render(<MockBoardAnalytics />);
    expect(await screen.findByText('Couldn’t load your mock history')).toBeInTheDocument();
    expect(screen.queryByText(/No mock boards yet/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
