import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScaleSlider } from './ScaleSlider';

const STOPS = [
  { value: 0, label: 'Low', tone: 'neutral', fill: 'gray' },
  { value: 25, label: 'Some', tone: 'neutral', fill: 'gray' },
  { value: 50, label: 'Middle', tone: 'signal', fill: 'blue' },
  { value: 75, label: 'Good', tone: 'success', fill: 'green' },
  { value: 100, label: 'High', tone: 'success', fill: 'green' },
];
const show = (value = null) => {
  const onCommit = vi.fn();
  render(<ScaleSlider label="How sure are you?" stops={STOPS} anchors={['Low', 'Middle', 'High']} fillGradient="linear-gradient(red, blue)" value={value} onCommit={onCommit} />);
  return { onCommit, slider: screen.getByRole('slider', { name: 'How sure are you?' }) };
};
// A real tap: the track is 324px wide, so each of the 4 steps is 75px after the thumb's inset.
const widen = (el) => { el.getBoundingClientRect = () => ({ left: 0, width: 324 }); };

describe('ScaleSlider', () => {
  it('holds no rating until one is made, and says so', () => {
    const { slider } = show();
    expect(screen.getByText('Not rated')).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuetext', 'Not rated');
    expect(slider.style.getPropertyValue('--scale-fill')).toBe('0%');
    expect(screen.queryByRole('button', { name: /Clear/ })).not.toBeInTheDocument();
  });

  it('shows a saved rating as its word and its place on the track', () => {
    const { slider } = show(50);
    expect(slider).toHaveValue('2');
    expect(slider).toHaveAttribute('aria-valuetext', 'Middle');
    expect(slider.style.getPropertyValue('--scale-fill')).toBe('50%');
    expect(slider.style.getPropertyValue('--scale-at')).toBe('blue');
  });

  it('a rating of zero is a rating, not none', () => {
    const { slider } = show(0);
    expect(slider).toHaveAttribute('aria-valuetext', 'Low');
    expect(screen.getByRole('button', { name: 'Clear: How sure are you?' })).toBeInTheDocument();
  });

  it('follows a drag at once, and saves one change on release', () => {
    const { slider, onCommit } = show(0);
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '1' } });
    fireEvent.change(slider, { target: { value: '3' } });
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(75);
  });

  it('a tap lands where it’s aimed, even on the first stop of an unrated scale', () => {
    const { slider, onCommit } = show();
    widen(slider);
    fireEvent.pointerDown(slider, { clientX: 12 });
    fireEvent.pointerUp(slider);
    expect(onCommit).toHaveBeenLastCalledWith(0);
    fireEvent.pointerDown(slider, { clientX: 310 });
    fireEvent.pointerUp(slider);
    expect(onCommit).toHaveBeenLastCalledWith(100);
  });

  it('releasing on the saved stop saves nothing', () => {
    const { slider, onCommit } = show(50);
    fireEvent.pointerDown(slider);
    fireEvent.pointerUp(slider);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('a page scroll that starts on the track changes nothing', () => {
    const { slider, onCommit } = show(50);
    fireEvent.change(slider, { target: { value: '4' } });
    fireEvent.pointerCancel(slider);
    expect(slider).toHaveValue('2');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('works from the keyboard, and Enter rates an unrated scale at its first stop', () => {
    const { slider, onCommit } = show();
    fireEvent.keyDown(slider, { key: 'Enter' });
    fireEvent.keyUp(slider, { key: 'Enter' });
    expect(onCommit).toHaveBeenLastCalledWith(0);
    fireEvent.change(slider, { target: { value: '2' } });
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(onCommit).toHaveBeenLastCalledWith(50);
  });

  it('Clear removes the rating', () => {
    const { onCommit } = show(75);
    fireEvent.click(screen.getByRole('button', { name: 'Clear: How sure are you?' }));
    expect(onCommit).toHaveBeenCalledWith(null);
  });
});
