import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Scratchpad, { DOCK_QUERY } from './Scratchpad';
import { getStrokes, setStrokes, resetScratchpadStore, MAX_KEYS } from './scratchpadStore';

// 2026-11-13: closing the Scratchpad threw the drawing away, and on a wide
// screen it covered the question under a blur. Now the work is kept per
// question, it docks beside the question when there's room, and it has Undo,
// a Clear that Undo brings back, and an eraser.

const draw = (canvas, points) => {
  fireEvent.pointerDown(canvas, { clientX: points[0][0], clientY: points[0][1], pointerId: 1 });
  for (const [x, y] of points.slice(1)) fireEvent.pointerMove(canvas, { clientX: x, clientY: y, pointerId: 1 });
  fireEvent.pointerUp(canvas, { pointerId: 1 });
};
const canvas = () => screen.getByLabelText(/^Drawing area/);
let matches = false;

beforeEach(() => {
  resetScratchpadStore();
  matches = false;
  window.matchMedia = vi.fn((query) => ({ matches: query === DOCK_QUERY && matches, addEventListener: () => {}, removeEventListener: () => {} }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 300, height: 200, left: 0, top: 0, right: 300, bottom: 200 });
});
afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.classList.remove('scratchpad-docked');
});

describe('Scratchpad', () => {
  it('keeps what you drew when it is closed and opened again', () => {
    const { rerender } = render(<Scratchpad isOpen onClose={() => {}} persistKey="q:1" />);
    draw(canvas(), [[10, 10], [50, 40]]);
    rerender(<Scratchpad isOpen={false} onClose={() => {}} persistKey="q:1" />);
    rerender(<Scratchpad isOpen onClose={() => {}} persistKey="q:1" />);
    expect(getStrokes('q:1')).toEqual([{ w: 300, erase: false, pts: [10, 10, 50, 40] }]);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });

  it('each question has its own pad', () => {
    const { rerender } = render(<Scratchpad isOpen onClose={() => {}} persistKey="q:1" />);
    draw(canvas(), [[10, 10], [20, 20]]);
    rerender(<Scratchpad isOpen onClose={() => {}} persistKey="q:2" />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    draw(canvas(), [[5, 5], [6, 6]]);
    expect(getStrokes('q:1')).toHaveLength(1);
    expect(getStrokes('q:2')).toHaveLength(1);
    rerender(<Scratchpad isOpen onClose={() => {}} persistKey="q:1" />);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled();
  });

  it('Undo takes back the last stroke; Clear can be undone right after', () => {
    render(<Scratchpad isOpen onClose={() => {}} persistKey="q:1" />);
    draw(canvas(), [[1, 1], [2, 2]]);
    draw(canvas(), [[3, 3], [4, 4]]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(getStrokes('q:1')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(getStrokes('q:1')).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(getStrokes('q:1')).toHaveLength(1);
  });

  it('the eraser draws erasing strokes', () => {
    render(<Scratchpad isOpen onClose={() => {}} persistKey="q:1" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Eraser' }));
    draw(canvas(), [[1, 1], [9, 9]]);
    expect(getStrokes('q:1')[0].erase).toBe(true);
  });

  it('docks beside the question on a wide screen or held sideways, and the page makes room', () => {
    matches = true;
    const { rerender } = render(<Scratchpad isOpen onClose={() => {}} persistKey="q:1" />);
    expect(screen.getByRole('dialog', { name: 'Scratchpad' })).toHaveAttribute('data-docked', 'true');
    expect(document.documentElement.classList.contains('scratchpad-docked')).toBe(true);
    rerender(<Scratchpad isOpen={false} onClose={() => {}} persistKey="q:1" />);
    expect(document.documentElement.classList.contains('scratchpad-docked')).toBe(false);
  });

  it('is a sheet on a phone held upright, with no blur', () => {
    render(<Scratchpad isOpen onClose={() => {}} persistKey="q:1" />);
    const dialog = screen.getByRole('dialog', { name: 'Scratchpad' });
    expect(dialog).toHaveAttribute('data-docked', 'false');
    expect(dialog.className).not.toMatch(/backdrop-blur/);
    expect(document.documentElement.classList.contains('scratchpad-docked')).toBe(false);
  });
});

describe('scratchpadStore', () => {
  it('survives a reload (sessionStorage) and keeps the last questions only', () => {
    setStrokes('q:a', [{ w: 1, erase: false, pts: [0, 0] }]);
    resetScratchpadStore.call(null); // a fresh module state would read storage back…
    setStrokes('q:a', [{ w: 1, erase: false, pts: [0, 0] }]);
    const saved = JSON.parse(sessionStorage.getItem('ree:scratchpad'));
    expect(saved[0][0]).toBe('q:a');
    for (let i = 0; i < MAX_KEYS + 5; i++) setStrokes(`q:${i}`, [{ w: 1, erase: false, pts: [i, i] }]);
    expect(getStrokes('q:a')).toEqual([]);
    expect(getStrokes(`q:${MAX_KEYS + 4}`)).toHaveLength(1);
  });

  it('no key keeps nothing', () => {
    setStrokes(null, [{ w: 1, erase: false, pts: [0, 0] }]);
    expect(getStrokes(null)).toEqual([]);
  });
});
