// The timer's chime: Web Audio tones from a context woken inside a click.
// Without Web Audio (tests, old WebViews) both calls do nothing and never
// throw; a context the browser hasn't let run plays nothing.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { primeChime, playChime, resetChimeForTests } from './chime';

function fakeAudio(state = 'running') {
  const oscillators = [];
  class FakeContext {
    constructor() { this.state = state; this.currentTime = 10; this.destination = {}; this.resume = vi.fn(async () => { this.state = 'running'; }); }
    createOscillator() {
      const o = { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(o);
      return o;
    }
    createGain() {
      return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    }
  }
  return { FakeContext, oscillators };
}

afterEach(() => {
  resetChimeForTests();
  delete window.AudioContext;
});

describe('chime', () => {
  it('does nothing, and never throws, without Web Audio', () => {
    expect(window.AudioContext).toBeUndefined();
    expect(primeChime()).toBe(false);
    expect(playChime('end')).toBe(false);
  });

  it('plays nothing before a click has woken the audio', () => {
    const { FakeContext, oscillators } = fakeAudio();
    window.AudioContext = FakeContext;
    expect(playChime('end')).toBe(false);
    expect(oscillators).toHaveLength(0);
  });

  it('plays two tones for a block, three for an exam section, once primed', () => {
    const { FakeContext, oscillators } = fakeAudio();
    window.AudioContext = FakeContext;
    expect(primeChime()).toBe(true);
    expect(playChime('end')).toBe(true);
    expect(oscillators).toHaveLength(2);
    expect(playChime('exam')).toBe(true);
    expect(oscillators).toHaveLength(5);
    expect(oscillators.every((o) => o.type === 'sine' && o.start.mock.calls.length === 1 && o.stop.mock.calls.length === 1)).toBe(true);
  });

  it('wakes a suspended context, and plays nothing while it is still suspended', () => {
    const { FakeContext } = fakeAudio('suspended');
    let ctx;
    // A browser that hasn't allowed sound yet: resume() waits.
    window.AudioContext = class extends FakeContext {
      constructor() { super(); ctx = this; this.resume = vi.fn(() => new Promise(() => {})); }
    };
    primeChime();
    expect(ctx.resume).toHaveBeenCalled();
    expect(playChime('end')).toBe(false);
  });

  it('swallows a context that cannot be created', () => {
    window.AudioContext = class { constructor() { throw new Error('blocked'); } };
    expect(primeChime()).toBe(false);
    expect(playChime()).toBe(false);
  });
});
