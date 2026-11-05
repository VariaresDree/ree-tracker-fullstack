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
//
// The measured height is applied to .flip-scene (the outer, non-rotating
// wrapper), not .flip-inner — a later fix moved it there (along with
// overflow:hidden) because both properties on .flip-inner forced its
// transform-style to flat and silently broke the 3D flip. See the note on
// .flip-scene/.flip-inner in styles/index.css.
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
    const scene = container.querySelector('.flip-scene');
    // useLayoutEffect ran before the stub was applied (jsdom scrollHeight=0
    // at mount), so re-render by flipping and flipping back to force a fresh
    // measure with the stub in place.
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(scene.style.height).toBe('205px');
  });

  it('switches to the BACK face height after a flip', () => {
    const { container } = render(<Flashcard card={CARD} />);
    stubFaceHeights(container, { front: 205, back: 537 });
    const btn = screen.getByRole('button');
    fireEvent.click(btn); // flip to back
    const scene = container.querySelector('.flip-scene');
    expect(scene.style.height).toBe('537px');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('flipping back returns the height to the front face', () => {
    const { container } = render(<Flashcard card={CARD} />);
    stubFaceHeights(container, { front: 205, back: 537 });
    const btn = screen.getByRole('button');
    fireEvent.click(btn); // -> back (537)
    fireEvent.click(btn); // -> front (205)
    const scene = container.querySelector('.flip-scene');
    expect(scene.style.height).toBe('205px');
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

describe('Flashcard — asking', () => {
  const front = () => document.querySelector('.flip-front');
  const back = () => document.querySelector('.flip-back');

  it('shows the formula up front when it is only a reference', () => {
    render(<Flashcard card={CARD} />);
    expect(front().textContent).toContain('X_c = 1/(2*pi*f*C)');
    expect(front().textContent).toContain('Tap to flip');
  });

  it("asks for the formula: the name on the front, the answer only on the back", () => {
    render(<Flashcard card={CARD} ask="formula" />);
    expect(front().textContent).toContain('Capacitive Reactance');
    expect(front().textContent).toContain('What’s the formula?');
    expect(front().textContent).not.toContain('1/(2*pi*f*C)');
    expect(back().textContent).toContain('1/(2*pi*f*C)');
    expect(screen.getByRole('button')).toHaveAccessibleDescription(/What’s the formula\?/);
  });

  it('asks for a value, on a constant', () => {
    render(<Flashcard card={{ ...CARD, kind: 'constant', formulaLatex: null, valueUnit: '8.854e-12' }} ask="formula" />);
    expect(front().textContent).toContain('What’s its value?');
    expect(front().textContent).not.toContain('8.854');
    expect(back().textContent).toContain('8.854');
  });

  it("asks for the name: not on the front, in its title or in the button's name", () => {
    const { container } = render(<Flashcard card={CARD} ask="name" />);
    expect(front().textContent).toContain('1/(2*pi*f*C)');
    expect(front().textContent).toContain('What is this called?');
    expect(front().textContent).not.toContain('Capacitive');
    expect(front().querySelector('[title*="Capacitive"]')).toBeNull();
    // Its tag, "Capacitance", would all but say it.
    expect(front().textContent).not.toContain('Capacitance');
    expect(front().querySelector('[title*="Capacitance"]')).toBeNull();
    expect(front().textContent).toContain('Electric Circuits 1');
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).not.toContain('Capacitive');
    fireEvent.click(button);
    expect(button.getAttribute('aria-label')).toContain('Capacitive');
    expect(container.querySelector('.flip-back').textContent).toContain('Capacitive');
  });
});

describe('Flashcard — the back', () => {
  const back = () => document.querySelector('.flip-back');

  it('stands alone: the name, the formula, each symbol, what it is for, the tip', () => {
    render(<Flashcard card={CARD} />);
    const text = back().textContent;
    for (const part of ['Capacitive Reactance', 'X_c = 1/(2*pi*f*C)', 'Where', 'frequency', 'Hz', 'What it’s for', 'Opposition a capacitor', 'Board tip', 'Watch the units.']) {
      expect(text).toContain(part);
    }
  });

  it('says what unit a formula gives, or that it has none', () => {
    const { unmount } = render(<Flashcard card={{ ...CARD, valueUnit: 'Ω' }} />);
    expect(back().textContent).toMatch(/Result in\s*Ω/);
    unmount();
    render(<Flashcard card={{ ...CARD, dimensionless: true }} />);
    expect(back().textContent).toContain('No unit');
  });

  it('leads a constant with its value, and its definition comes second', () => {
    render(<Flashcard card={{ ...CARD, kind: 'constant', valueUnit: '8.854e-12', formulaLatex: 'e = C d / A' }} />);
    const text = back().textContent;
    expect(text.indexOf('8.854e-12')).toBeLessThan(text.indexOf('e = C d / A'));
    expect(text).not.toMatch(/Result in/);
  });

  it('never prints the string "null" as a unit', () => {
    render(<Flashcard card={{ ...CARD, variables: [{ symbol: 'x', meaning: 'a ratio', unit: 'null' }] }} />);
    expect(back().textContent).not.toContain('null');
  });
});

describe('Flashcard description', () => {
  it('describes the face on show, so its content reaches a screen reader', () => {
    render(<Flashcard card={CARD} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleDescription(/X_c = 1\/\(2\*pi\*f\*C\)/);
    fireEvent.click(button);
    expect(screen.getByRole('button').getAttribute('aria-describedby')).toMatch(/-back$/);
  });
});
