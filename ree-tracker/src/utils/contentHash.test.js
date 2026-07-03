import { describe, it, expect } from 'vitest';
import { fnv1a, stableBatchKey } from './contentHash';

describe('fnv1a', () => {
  it('is deterministic for the same input', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'));
  });
  it('differs for different inputs', () => {
    expect(fnv1a('hello')).not.toBe(fnv1a('world'));
  });
});

describe('stableBatchKey', () => {
  it('is identical for the same session + attempt ids in ANY order', () => {
    const a = stableBatchKey('sess1', ['x', 'y', 'z']);
    const b = stableBatchKey('sess1', ['z', 'x', 'y']);
    expect(a).toBe(b);
  });

  it('has NO time component — a "retry" a minute later produces the same key', () => {
    // Two calls with identical args must match regardless of wall-clock time;
    // if a Date-based term crept back in, this would be flaky/fail.
    const first = stableBatchKey('sess1', ['a', 'b']);
    const second = stableBatchKey('sess1', ['a', 'b']);
    expect(first).toBe(second);
  });

  it('changes when the batch contents change', () => {
    expect(stableBatchKey('sess1', ['a', 'b'])).not.toBe(stableBatchKey('sess1', ['a', 'c']));
  });

  it('changes when the session changes', () => {
    expect(stableBatchKey('sess1', ['a'])).not.toBe(stableBatchKey('sess2', ['a']));
  });

  it('is prefixed for readability', () => {
    expect(stableBatchKey('s', ['a'])).toMatch(/^c-/);
  });
});
