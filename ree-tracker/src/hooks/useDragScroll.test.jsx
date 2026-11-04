// Sideways strips (Account's jump links, page tabs, the exam navigator) scroll
// by touch and trackpad but, with their scrollbars hidden, not with a mouse.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useDragScroll } from './useDragScroll';

function Strip({ onPick }) {
  const drag = useDragScroll();
  return (
    <div data-testid="strip" {...drag}>
      <button type="button" onClick={onPick}>One</button>
    </div>
  );
}

function setup({ scrollWidth = 800, clientWidth = 300 } = {}) {
  const onPick = vi.fn();
  render(<Strip onPick={onPick} />);
  const strip = screen.getByTestId('strip');
  Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(strip, 'clientWidth', { configurable: true, value: clientWidth });
  strip.scrollLeft = 100;
  return { strip, onPick, one: screen.getByRole('button', { name: 'One' }) };
}

const down = (el, over = {}) => fireEvent.pointerDown(el, { pointerType: 'mouse', button: 0, clientX: 200, ...over });
const move = (clientX) => act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientX })); });
const up = () => act(() => { window.dispatchEvent(new MouseEvent('pointerup')); });

describe('useDragScroll', () => {
  it('a mouse drag scrolls the strip', () => {
    const { strip, one } = setup();
    down(one);
    move(150);
    expect(strip.scrollLeft).toBe(150);
    move(120);
    expect(strip.scrollLeft).toBe(180);
    up();
    move(0);
    expect(strip.scrollLeft).toBe(180);
  });

  it('a drag that ends on a link or tab does not click it', () => {
    const { one, onPick } = setup();
    down(one);
    move(150);
    up();
    fireEvent.click(one);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('a press that barely moves is still a click', () => {
    const { strip, one, onPick } = setup();
    down(one);
    move(197);
    up();
    fireEvent.click(one);
    expect(strip.scrollLeft).toBe(100);
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('a click after a finished drag works, by keyboard or mouse', async () => {
    vi.useFakeTimers();
    const { one, onPick } = setup();
    down(one);
    move(150);
    up();
    act(() => vi.runAllTimers());
    vi.useRealTimers();
    fireEvent.click(one);
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('leaves touch to the browser, and other buttons alone', () => {
    const { strip, one } = setup();
    down(one, { pointerType: 'touch' });
    move(150);
    expect(strip.scrollLeft).toBe(100);
    up();
    down(one, { button: 2 });
    move(150);
    expect(strip.scrollLeft).toBe(100);
    up();
  });

  it('does nothing on a strip with no overflow', () => {
    const { strip, one, onPick } = setup({ scrollWidth: 300 });
    down(one);
    move(150);
    up();
    expect(strip.scrollLeft).toBe(100);
    fireEvent.click(one);
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('stops links being dragged as links', () => {
    const { strip } = setup();
    const event = new Event('dragstart', { bubbles: true, cancelable: true });
    strip.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
