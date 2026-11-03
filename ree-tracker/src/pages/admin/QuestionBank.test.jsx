// Admin › Question bank: four views in the URL, each mounted when first opened and
// kept after that, so switching away can't lose work in progress.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const mounted = vi.fn();
const probe = (name) => ({ default: (props) => {
  mounted(name);
  return <button type="button" onClick={() => props.onSaved?.()}>{name}</button>;
} });
vi.mock('../../features/admin/ai/QuestionGenerator', () => probe('generator'));
vi.mock('../../features/admin/exchange/ImportFromAI', () => probe('import'));
vi.mock('../../features/admin/exchange/FixWithAI', () => probe('fix-with-ai'));
vi.mock('../../features/admin/AnswerPositions', () => probe('answer-positions'));
vi.mock('../../features/library/LibraryIngestion', () => probe('from-a-file'));
vi.mock('../../features/library/LibraryOverview', () => probe('overview'));
vi.mock('../../features/library/ManualIngestionForm', () => probe('manual'));
vi.mock('../../features/library/VaultDataGrid', () => probe('grid'));
vi.mock('../../features/library/ReviewQueue', () => probe('review-queue'));
const initializeVault = vi.fn();
vi.mock('../../features/library/useVaultGrid', () => ({ useVaultGrid: () => ({ initializeVault }) }));
vi.mock('../../features/library/useAIIngestion', () => ({ useAIIngestion: () => ({}) }));
vi.mock('../../features/library/useManualIngestion', () => ({ useManualIngestion: () => ({}) }));
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ isAdmin: true }) }));

const { default: QuestionBank } = await import('./QuestionBank');

let search;
function Where() {
  search = useLocation().search;
  return null;
}
const show = (url = '/admin?tab=questions') => render(<MemoryRouter initialEntries={[url]}><QuestionBank /><Where /></MemoryRouter>);
const pick = (name) => fireEvent.click(screen.getByRole('radio', { name }));
const shown = (name) => {
  const el = screen.queryByRole('button', { name, hidden: true });
  return !!el && !el.closest('[hidden]');
};

beforeEach(() => {
  mounted.mockClear();
  initializeVault.mockClear();
});

describe('Question bank views', () => {
  it('opens on the Bank, with nothing else on the page or loaded', () => {
    show();
    expect(screen.getByRole('radio', { name: 'Bank' })).toBeChecked();
    expect(shown('overview')).toBe(true);
    expect(shown('grid')).toBe(true);
    for (const name of ['generator', 'import', 'from-a-file', 'manual', 'review-queue', 'fix-with-ai', 'answer-positions']) {
      expect(mounted).not.toHaveBeenCalledWith(name);
    }
  });

  it('keeps the view in the URL, leaving the tab alone', () => {
    show();
    pick('Review');
    expect(search).toBe('?tab=questions&view=review');
    expect(shown('review-queue')).toBe(true);
    expect(shown('grid')).toBe(false);
    pick('Bank');
    expect(search).toBe('?tab=questions');
  });

  it('a link opens the view and the way it names', () => {
    show('/admin?tab=questions&view=add&how=file');
    expect(shown('from-a-file')).toBe(true);
    expect(shown('generator')).toBe(false);
    expect(mounted).not.toHaveBeenCalledWith('generator');
  });

  it('Add shows one way at a time, and Fix holds the two repair tools', () => {
    show();
    pick('Add');
    expect(shown('generator')).toBe(true);
    pick('By hand');
    expect(search).toContain('how=manual');
    expect(shown('manual')).toBe(true);
    expect(shown('generator')).toBe(false);
    pick('Fix');
    expect(shown('fix-with-ai')).toBe(true);
    expect(shown('answer-positions')).toBe(true);
  });

  it('switching away keeps a tool mounted, so work in progress survives', () => {
    show();
    pick('Add');
    pick('Bank');
    expect(screen.getByRole('button', { name: 'generator', hidden: true })).toBeInTheDocument();
    expect(shown('generator')).toBe(false);
    pick('Add');
    expect(shown('generator')).toBe(true);
  });

  it('adding refreshes the bank and opens the review queue afresh', () => {
    show();
    pick('Review');
    const before = mounted.mock.calls.filter(([n]) => n === 'review-queue').length;
    const queue = screen.getByRole('button', { name: 'review-queue' });
    pick('Add');
    fireEvent.click(screen.getByRole('button', { name: 'generator' }));
    expect(initializeVault).toHaveBeenCalledTimes(1);
    expect(mounted.mock.calls.filter(([n]) => n === 'review-queue').length).toBeGreaterThan(before);
    expect(screen.getByRole('button', { name: 'review-queue', hidden: true })).not.toBe(queue);
  });
});
