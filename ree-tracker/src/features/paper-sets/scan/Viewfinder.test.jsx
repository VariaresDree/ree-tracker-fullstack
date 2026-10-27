// The live viewfinder takes a steady sheet by itself, but not the sheet just
// scored: opening again for the next sheet, it waits for that sheet to leave
// the frame. It used to open ready, so "Scan the next sheet" took the
// previous taker's sheet again about a second later.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Viewfinder from './Viewfinder';

const quad = [{ x: 100, y: 50 }, { x: 540, y: 50 }, { x: 540, y: 600 }, { x: 100, y: 600 }];
const steady = { found: true, quad, squares: quad, page: { hash: 'h', index: 0 } };
const gone = { found: false, quad: null, squares: [], reason: 'no-sheet', page: null };

function setup(over = {}) {
  const view = { current: steady };
  const props = {
    cameraStatus: 'live',
    attachVideo: () => {},
    capture: () => ({ width: 640, height: 640, data: new Uint8ClampedArray(4) }),
    omr: { detect: async () => view.current },
    active: true,
    expectHash: 'h',
    readPages: new Set(),
    nextPageIndex: 0,
    armKey: 0,
    reading: false,
    onCapture: vi.fn(async () => {}),
    ...over,
  };
  render(<Viewfinder {...props} />);
  return { props, view };
}

// Twelve ticks of the 150 ms loop: enough for six steady checks.
const run = async (ms = 2000) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
};

afterEach(() => { vi.useRealTimers(); });

describe('Viewfinder auto-capture', () => {
  it('takes a sheet held still', async () => {
    vi.useFakeTimers();
    const { props } = setup();
    await run();
    expect(props.onCapture).toHaveBeenCalledTimes(1);
    expect(props.onCapture.mock.calls[0][1]).toBe('auto');
  });

  it('for the next sheet, waits for the last one to leave the frame', async () => {
    vi.useFakeTimers();
    const { props, view } = setup({ armKey: 2, startArmed: false });
    await run();
    expect(props.onCapture).not.toHaveBeenCalled();

    view.current = gone;
    await run(800);
    view.current = steady;
    await run();
    expect(props.onCapture).toHaveBeenCalledTimes(1);
  });
});
