// Your rating vs your answers (Progress › Confidence) and the admin
// high-yield list (CELE round): the comparison rule, the four groups with a
// Drill where it helps, the empty and too-few states, and the admin toggle.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { compareSelfRating } from '../../syllabus/selfRating';

let topics = [];
vi.mock('../../syllabus/useSyllabus', () => ({ useSyllabus: () => ({ topics }) }));
const navigateFn = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigateFn }));
const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn() }) }));

const { default: SelfVsData } = await import('./SelfVsData');
const { default: HighYieldTopics } = await import('../../admin/HighYieldTopics');

const t = (name, attempts, mastery, confidence = null, dread = null) => ({
  topicId: name.toLowerCase(), name, subject: 'EE', attempts, masteryEffective: mastery, confidence, dread,
});

beforeEach(() => {
  navigateFn.mockClear();
  apiRequest.mockReset();
});

describe('compareSelfRating', () => {
  it('sorts each topic into where the rating and the answers disagree', () => {
    const c = compareSelfRating([
      t('Overrated', 20, 0.4, 75),      // 75 vs 40: above by 35
      t('Fine', 20, 0.6, 50),           // within 25
      t('Underrated', 20, 0.8, 25),     // 80 vs 25: below by 55
      t('Feared weak', 20, 0.3, null, 4),
      t('Feared strong', 20, 0.9, null, 3),
      t('New', 4, 0.2, 100),            // too few answers
      t('Unrated', 50, 0.5),
    ]);
    expect(c.above.map((r) => r.name)).toEqual(['Overrated']);
    expect(c.below.map((r) => r.name)).toEqual(['Underrated']);
    expect(c.dreadedWeak.map((r) => r.name)).toEqual(['Feared weak']);
    expect(c.dreadedStrong.map((r) => r.name)).toEqual(['Feared strong']);
    expect(c.rated).toBe(6);
    expect(c.tooFew).toBe(1);
  });
});

describe('SelfVsData', () => {
  const show = () => render(<MemoryRouter><SelfVsData /></MemoryRouter>);

  it('with nothing rated, says where to rate', () => {
    topics = [t('A', 20, 0.5)];
    show();
    expect(screen.getByText('No topics rated yet')).toBeInTheDocument();
  });

  it('lists the disagreements, with Drill on the ones to work on', () => {
    topics = [t('Transformers', 20, 0.4, 75), t('Illumination', 30, 0.9, 25), t('Protection', 15, 0.3, null, 4)];
    show();
    const above = screen.getByRole('region', { name: 'Rated above your answers' });
    expect(within(above).getByText('You: 75% sure · answers: 40%')).toBeInTheDocument();
    fireEvent.click(within(above).getByRole('button', { name: 'Drill Transformers' }));
    expect(navigateFn).toHaveBeenCalledWith('/practice', expect.objectContaining({ state: { preset: expect.objectContaining({ drillTopicId: 'transformers' }) } }));
    expect(within(screen.getByRole('region', { name: 'Dreaded, and the answers agree' })).getByText('Dread: I’d skip it · answers: 30%')).toBeInTheDocument();
    const better = screen.getByRole('region', { name: 'You know these better than you think' });
    expect(within(better).queryByRole('button')).not.toBeInTheDocument();
  });

  it('says when the ratings agree, and how many wait for answers', () => {
    topics = [t('A', 20, 0.5, 50), t('B', 3, 0.5, 100)];
    show();
    expect(screen.getByText(/Your ratings and your answers agree so far. 1 rated topic needs 10 answers/)).toBeInTheDocument();
  });
});

describe('HighYieldTopics (admin)', () => {
  it('loads when opened and saves a tick at once', async () => {
    apiRequest.mockImplementation(async (endpoint, method = 'GET') => (method === 'GET'
      ? { topics: [{ id: 't1', subject: 'EE', name: 'Machines', highYield: false }] }
      : { topic: { id: 't1', highYield: true } }));
    render(<HighYieldTopics />);
    fireEvent.click(screen.getByRole('button', { name: /High-yield topics/ }));
    const box = await screen.findByRole('checkbox', { name: 'Machines' });
    fireEvent.click(box);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/config/topics/t1', 'PUT', { highYield: true }));
    expect(box).toBeChecked();
  });

  it('a refused save puts the tick back', async () => {
    apiRequest.mockImplementation(async (endpoint, method = 'GET') => {
      if (method === 'GET') return { topics: [{ id: 't1', subject: 'EE', name: 'Machines', highYield: true }] };
      throw new Error('Only admins can do this.');
    });
    render(<HighYieldTopics />);
    fireEvent.click(screen.getByRole('button', { name: /High-yield topics/ }));
    const box = await screen.findByRole('checkbox', { name: 'Machines' });
    fireEvent.click(box);
    await waitFor(() => expect(box).toBeChecked());
  });
});
