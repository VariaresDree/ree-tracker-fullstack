// Pieces that moved in the reorganization: where a recommended fix goes
// (from the old Dashboard) and the "Your rank" card (from Profile's
// comparative analytics, now above the rankings list).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ default: vi.fn() }));
let online = true;
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => online }));
vi.mock('../../services/dbQueries', () => ({ fetchLeaderboardMe: vi.fn() }));

const { fetchLeaderboardMe } = await import('../../services/dbQueries');
const { routePrescription } = await import('./prescriptionRouting');
const { default: YourRankCard } = await import('../exams/YourRankCard');

describe('routePrescription', () => {
  const run = (action, tos) => {
    const navigate = vi.fn();
    routePrescription(action, { navigate, tos });
    return navigate.mock.calls[0];
  };

  it('formula cards open the Library on that topic', () => {
    expect(run({ type: 'FORMULA_CARDS', payload: { topic: 'Transformers' } }))
      .toEqual(['/library?tab=formulas', { state: { search: 'Transformers', kind: 'formula' } }]);
  });

  it('reading opens the handouts', () => {
    expect(run({ type: 'READ', payload: { topic: 'Machines' } })).toEqual(['/library?tab=handouts']);
  });

  it('a blind spot starts a blind-spot drill on that topic', () => {
    const [to, { state }] = run({ type: 'BLIND_SPOT', payload: { topic: 'Protection', subject: 'EE', topicId: 't' } });
    expect(to).toBe('/practice');
    expect(state.preset).toMatchObject({ source: 'smart-drill', drillMode: 'blind-spot', drillTopicId: 't' });
  });

  it('due reviews start the review queue', () => {
    const [, { state }] = run({ type: 'SRS_DUE', payload: { count: 12 } });
    expect(state.preset).toMatchObject({ count: 12 });
  });

  it('an old topic-only action finds its subject through the TOS', () => {
    const [, { state }] = run({ type: 'SRS_REVIEW', payload: { topic: 'Algebra' } }, { Mathematics: ['Algebra'] });
    expect(state.preset).toMatchObject({ sessionMode: 'flashcard', studyMode: 'subtopic', subject: 'Mathematics', subtopic: 'Algebra' });
  });
});

describe('YourRankCard', () => {
  beforeEach(() => {
    online = true;
    vi.clearAllMocks();
  });

  it('shows the rank out of everyone ranked', async () => {
    fetchLeaderboardMe.mockResolvedValue({ rank: 4, total: 37 });
    render(<YourRankCard />);
    expect(await screen.findByText('#4')).toBeInTheDocument();
    expect(screen.getByText('of 37 reviewers')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Your rank' })).toBeInTheDocument();
  });

  it('your place in the list below wins over the snapshot rank, so the two never disagree', async () => {
    fetchLeaderboardMe.mockResolvedValue({ rank: 2, total: 4 });
    render(<YourRankCard listRank={1} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(await screen.findByText('of 4 reviewers')).toBeInTheDocument();
    expect(screen.queryByText('#2')).not.toBeInTheDocument();
  });

  it('unranked says how to join', async () => {
    fetchLeaderboardMe.mockResolvedValue({ rank: null, total: 37, unranked: true });
    render(<YourRankCard />);
    expect(await screen.findByText(/Not ranked yet/)).toBeInTheDocument();
  });

  it('offline asks to reconnect, without a request', () => {
    online = false;
    render(<YourRankCard />);
    expect(screen.getByText('Reconnect to see your rank.')).toBeInTheDocument();
    expect(fetchLeaderboardMe).not.toHaveBeenCalled();
  });
});
