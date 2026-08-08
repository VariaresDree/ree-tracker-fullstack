import { describe, it, expect } from 'vitest';
const { wouldCreateCycle, subtreeIds } = require('../src/services/folderTree');

describe('wouldCreateCycle — the guard that stops Folder.parentId corruption', () => {
  it('allows moving a folder to root (null parent)', () => {
    expect(wouldCreateCycle('a', null, new Map())).toBe(false);
  });

  it('rejects a folder becoming its own parent', () => {
    expect(wouldCreateCycle('a', 'a', new Map())).toBe(true);
  });

  it('rejects moving a folder into its direct child', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: null }],
      ['b', { id: 'b', parentId: 'a' }],
    ]);
    expect(wouldCreateCycle('a', 'b', byId)).toBe(true);
  });

  it('rejects moving a folder into a deep descendant', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: null }],
      ['b', { id: 'b', parentId: 'a' }],
      ['c', { id: 'c', parentId: 'b' }],
      ['d', { id: 'd', parentId: 'c' }],
    ]);
    expect(wouldCreateCycle('a', 'd', byId)).toBe(true);
  });

  it('allows moving a folder into an unrelated folder', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: null }],
      ['b', { id: 'b', parentId: null }],
    ]);
    expect(wouldCreateCycle('a', 'b', byId)).toBe(false);
  });

  it('allows moving a folder into its own sibling (not an ancestor)', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: null }],
      ['b', { id: 'b', parentId: 'a' }],
      ['c', { id: 'c', parentId: 'a' }],
    ]);
    expect(wouldCreateCycle('b', 'c', byId)).toBe(false);
  });

  it('does not infinite-loop on a pre-existing unrelated cycle in the data', () => {
    // x <-> y already corrupted; moving unrelated folder z under x must
    // terminate, not hang walking x/y forever.
    const byId = new Map([
      ['x', { id: 'x', parentId: 'y' }],
      ['y', { id: 'y', parentId: 'x' }],
      ['z', { id: 'z', parentId: null }],
    ]);
    expect(wouldCreateCycle('z', 'x', byId)).toBe(false);
  });
});

describe('subtreeIds — every folder id under a root, for cascade blob cleanup', () => {
  it('returns just the folder itself when it has no children', () => {
    const all = [{ id: 'a', parentId: null }];
    expect(subtreeIds('a', all)).toEqual(new Set(['a']));
  });

  it('includes every nested descendant, arbitrarily deep', () => {
    const all = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'd', parentId: 'c' },
      { id: 'other', parentId: null },
    ];
    expect(subtreeIds('a', all)).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('does not include siblings or unrelated trees', () => {
    const all = [
      { id: 'a', parentId: null },
      { id: 'a-child', parentId: 'a' },
      { id: 'b', parentId: null },
      { id: 'b-child', parentId: 'b' },
    ];
    expect(subtreeIds('a', all)).toEqual(new Set(['a', 'a-child']));
  });
});
