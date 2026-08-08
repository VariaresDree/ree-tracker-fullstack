import { describe, it, expect } from 'vitest';
const { classifyFolder, isCycleAnchor, groupCycles } = require('../scripts/recoverOrphanedFolders');

describe('classifyFolder — reachability from the vault root', () => {
  it('classifies a true root folder as root-reachable', () => {
    const byId = new Map([['a', { id: 'a', parentId: null }]]);
    expect(classifyFolder(byId.get('a'), byId)).toBe('root-reachable');
  });

  it('classifies a nested folder under a real chain to root as root-reachable', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: null }],
      ['b', { id: 'b', parentId: 'a' }],
      ['c', { id: 'c', parentId: 'b' }],
    ]);
    expect(classifyFolder(byId.get('c'), byId)).toBe('root-reachable');
  });

  it('classifies parentId pointing at itself as self', () => {
    const byId = new Map([['a', { id: 'a', parentId: 'a' }]]);
    expect(classifyFolder(byId.get('a'), byId)).toBe('self');
  });

  it('classifies a 2-node mutual cycle as cycle for both members', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: 'b' }],
      ['b', { id: 'b', parentId: 'a' }],
    ]);
    expect(classifyFolder(byId.get('a'), byId)).toBe('cycle');
    expect(classifyFolder(byId.get('b'), byId)).toBe('cycle');
  });

  it('classifies a parentId pointing at a deleted id as dangling', () => {
    const byId = new Map([['a', { id: 'a', parentId: 'ghost' }]]);
    expect(classifyFolder(byId.get('a'), byId)).toBe('dangling');
  });

  it('classifies a folder several levels below a cycle as cycle too (whole subtree is unreachable)', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: 'b' }],
      ['b', { id: 'b', parentId: 'a' }],
      ['c', { id: 'c', parentId: 'a' }], // nests correctly under the corrupted anchor
    ]);
    expect(classifyFolder(byId.get('c'), byId)).toBe('cycle');
  });
});

describe('isCycleAnchor — distinguishes true cycle participants from mere descendants', () => {
  it('a true self-reference is its own anchor', () => {
    const byId = new Map([['a', { id: 'a', parentId: 'a' }]]);
    expect(isCycleAnchor(byId.get('a'), byId)).toBe(true);
  });

  it('both members of a 2-node cycle are anchors', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: 'b' }],
      ['b', { id: 'b', parentId: 'a' }],
    ]);
    expect(isCycleAnchor(byId.get('a'), byId)).toBe(true);
    expect(isCycleAnchor(byId.get('b'), byId)).toBe(true);
  });

  it('a correctly-linked descendant of a self-referencing root is NOT an anchor — it heals for free', () => {
    const byId = new Map([
      ['root', { id: 'root', parentId: 'root' }],
      ['child', { id: 'child', parentId: 'root' }],
    ]);
    expect(isCycleAnchor(byId.get('child'), byId)).toBe(false);
    // But it IS still classified unreachable overall (informational), since
    // classifyFolder answers a different question ("is this reachable at all").
    expect(classifyFolder(byId.get('child'), byId)).toBe('cycle');
  });

  it('a deep descendant of a 2-node cycle is NOT an anchor', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: 'b' }],
      ['b', { id: 'b', parentId: 'a' }],
      ['c', { id: 'c', parentId: 'a' }],
      ['d', { id: 'd', parentId: 'c' }],
    ]);
    expect(isCycleAnchor(byId.get('c'), byId)).toBe(false);
    expect(isCycleAnchor(byId.get('d'), byId)).toBe(false);
  });

  it('a true root folder is not an anchor (nothing to fix)', () => {
    const byId = new Map([['a', { id: 'a', parentId: null }]]);
    expect(isCycleAnchor(byId.get('a'), byId)).toBe(false);
  });
});

describe('groupCycles — groups cycle members into their connected components', () => {
  it('groups a single 2-node cycle as one component', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: 'b' }],
      ['b', { id: 'b', parentId: 'a' }],
    ]);
    const groups = groupCycles([byId.get('a'), byId.get('b')], byId);
    expect(groups).toHaveLength(1);
    expect(groups[0].sort()).toEqual(['a', 'b']);
  });

  it('keeps two independent cycles as separate components', () => {
    const byId = new Map([
      ['a', { id: 'a', parentId: 'b' }],
      ['b', { id: 'b', parentId: 'a' }],
      ['x', { id: 'x', parentId: 'y' }],
      ['y', { id: 'y', parentId: 'x' }],
    ]);
    const groups = groupCycles([byId.get('a'), byId.get('b'), byId.get('x'), byId.get('y')], byId);
    expect(groups).toHaveLength(2);
    const sorted = groups.map((g) => g.sort()).sort();
    expect(sorted).toEqual([['a', 'b'], ['x', 'y']]);
  });
});
