import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../account/ExamPlanForm', () => ({
  default: ({ onSaved, submitLabel, offerPlan }) => (
    <button type="button" onClick={() => onSaved({ planned: offerPlan })}>{submitLabel}</button>
  ),
}));

const { default: FirstRunCard } = await import('./FirstRunCard');

beforeEach(() => localStorage.clear());

describe('FirstRunCard', () => {
  it('asks for the exam plan, with the study plan on offer, and goes once it is saved', () => {
    const { container } = render(<FirstRunCard uid="u1" show />);
    expect(screen.getByRole('heading', { name: 'Set up your review' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save my exam plan' }));
    expect(container).toBeEmptyDOMElement();
  });

  it('"Later" hides it for this account on this device', () => {
    const { container, unmount } = render(<FirstRunCard uid="u1" show />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(container).toBeEmptyDOMElement();
    unmount();
    expect(render(<FirstRunCard uid="u1" show />).container).toBeEmptyDOMElement();
    expect(render(<FirstRunCard uid="u2" show />).container).not.toBeEmptyDOMElement();
  });

  it('shows only when Today asks for it', () => {
    expect(render(<FirstRunCard uid="u1" show={false} />).container).toBeEmptyDOMElement();
  });
});
