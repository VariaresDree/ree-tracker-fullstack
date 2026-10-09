import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: SolutionPanel } = await import('./SolutionPanel');

const q = { id: 'q1', text: 'Q', answer: '42 V', fixedExplanation: 'Use KVL.' };

beforeEach(() => vi.clearAllMocks());

describe('SolutionPanel', () => {
  it('shows the written solution on request', () => {
    render(<SolutionPanel question={q} isOnline aiText={null} onExplain={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show solution' }));
    expect(screen.getByText('Use KVL.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide solution' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('labels the AI explanation as AI, never the written solution', () => {
    render(<SolutionPanel question={q} isOnline aiText="AI steps" onExplain={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Explain with AI' }));
    expect(screen.getByRole('heading', { name: /AI explanation/ })).toBeInTheDocument();
    expect(screen.getByText('AI steps')).toBeInTheDocument();
    expect(screen.queryByText('Use KVL.')).not.toBeInTheDocument();
  });

  it('asks for an explanation and reports a failure', async () => {
    const onExplain = vi.fn().mockResolvedValue(null);
    render(<SolutionPanel question={q} isOnline aiText={null} onExplain={onExplain} />);
    fireEvent.click(screen.getByRole('button', { name: 'Explain with AI' }));
    expect(onExplain).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('AI explanation unavailable right now.'));
    expect(screen.getByRole('button', { name: 'Explain with AI' })).toBeInTheDocument();
  });

  it('works offline only with a saved explanation', () => {
    const { rerender } = render(<SolutionPanel question={q} isOnline={false} aiText={null} onExplain={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Explain with AI' })).toBeDisabled();
    rerender(<SolutionPanel question={q} isOnline={false} aiText="Saved" onExplain={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Explain with AI' })).toBeEnabled();
  });

  it('without a written solution, can still show the answer', () => {
    render(<SolutionPanel question={{ ...q, fixedExplanation: null }} isOnline aiText={null} onExplain={vi.fn()} showAnswer />);
    fireEvent.click(screen.getByRole('button', { name: 'Show solution' }));
    expect(screen.getByText(/No written solution yet/)).toBeInTheDocument();
    expect(screen.getByText('42 V')).toBeInTheDocument();
  });
});
