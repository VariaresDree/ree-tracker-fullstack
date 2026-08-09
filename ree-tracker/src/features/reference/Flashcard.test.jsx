// src/features/reference/Flashcard.test.jsx
// Locks the height-tracking fix: grid-stacking both faces made the card
// always size to the TALLER face, even while showing the shorter one —
// measured live as 422px of dead space (67% of the card) on a real front
// face. .flip-inner's explicit height must track whichever face is ACTIVE,
// not just the initial (front) one, and must update after a flip.
//
// jsdom doesn't do real layout, so scrollHeight is always 0 — these tests
// stub scrollHeight per-element (front vs back) to assert the component
// picks the right one, not any particular pixel value.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Flashcard from './Flashcard';

vi.mock('../../components/LatexRenderer', () => ({
  default: ({ content }) => <span>{content}</span>,
}));

const CARD = {
  id: 'c1',
  kind: 'formula',
  symbol: 'X_c',
  name: 'Capacitive Reactance',
  formulaLatex: 'X_c = 1/(2*pi*f*C)',
  valueUnit: null,
  description: 'Opposition a capacitor presents to AC current.',
  variables: [{ symbol: 'f', meaning: 'frequency', unit: 'Hz' }],
  purposeExamTip: 'Watch the units.',
  subject: 'EE',
  topic: { name: 'Electric Circuits 1' },
  subtopicTag: 'Capacitance',
  source: null,
};

// Stubs scrollHeight on the front/back face elements (by their aria-hidden
// state, which flips with `flipped`) so the ResizeObserver-driven measure()
// picks up deterministic values instead of jsdom's always-0.
function stubFaceHeights(container, { front, back }) {
  const faces = container.querySelectorAll('.flip-face');
  faces.forEach((el) => {
    const isFront = el.className.includes('flip-front');
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: isFront ? front : back });
  });
}

describe('Flashcard — active-face height tracking', () => {
  it('sizes to the FRONT face on initial mount, not the taller back face', () => {
    const { container } = render(<Flashcard card={CARD} />);
    stubFaceHeights(container, { front: 205, back: 537 });
    // Trigger the layout effect's measure() again now that heights are stubbed
    // (a resize observer firing is the real-world equivalent).
    fireEvent(window, new Event('resize'));
    const inner = container.querySelector('.flip-inner');
    // useLayoutEffect ran before the stub was applied (jsdom scrollHeight=0
    // at mount), so re-render by flipping and flipping back to force a fresh
    // measure with the stub in place.
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(inner.style.height).toBe('205px');
  });

  it('switches to the BACK face height after a flip', () => {
    const { container } = render(<Flashcard card={CARD} />);
    stubFaceHeights(container, { front: 205, back: 537 });
    const btn = screen.getByRole('button');
    fireEvent.click(btn); // flip to back
    const inner = container.querySelector('.flip-inner');
    expect(inner.style.height).toBe('537px');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('flipping back returns the height to the front face', () => {
    const { container } = render(<Flashcard card={CARD} />);
    stubFaceHeights(container, { front: 205, back: 537 });
    const btn = screen.getByRole('button');
    fireEvent.click(btn); // -> back (537)
    fireEvent.click(btn); // -> front (205)
    const inner = container.querySelector('.flip-inner');
    expect(inner.style.height).toBe('205px');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('the inactive face stays aria-hidden so a screen reader never reads both sides', () => {
    render(<Flashcard card={CARD} />);
    const btn = screen.getByRole('button');
    const front = () => document.querySelector('.flip-front');
    const back = () => document.querySelector('.flip-back');
    expect(front()).toHaveAttribute('aria-hidden', 'false');
    expect(back()).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(btn);
    expect(front()).toHaveAttribute('aria-hidden', 'true');
    expect(back()).toHaveAttribute('aria-hidden', 'false');
  });
});
