// src/utils/shuffle.js
// Shared randomization helpers used by every quiz surface (Active Review, Board
// Simulator). Replaces the biased `arr.sort(() => 0.5 - Math.random())` pattern,
// which is NOT uniform on V8 and tends to leave items near their original order.

// Unbiased Fisher-Yates shuffle. Returns a NEW array; does not mutate input.
export function shuffleArray(input) {
  const arr = [...(input || [])];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Stratified sample: pick `count` items spread as evenly as possible across the
// groups produced by `keyFn` (default: item.subtopic). This guarantees subtopic
// diversity in the final session even when the underlying bank is dominated by a
// single subtopic (e.g. Math → mostly "Algebra & Complex Numbers", ESAS → mostly
// "Chemistry for Engineers"). A plain shuffle+slice would otherwise return ~90%
// of the dominant subtopic. Falls back to a full shuffle when there's a single
// group or when `count` >= available items.
export function stratifiedSample(items, count, keyFn = (q) => q?.subtopic || 'General') {
  const pool = shuffleArray(items);
  const n = count || pool.length;
  if (pool.length <= n) return pool;

  // Bucket by group, preserving the already-shuffled order within each bucket.
  const buckets = new Map();
  for (const item of pool) {
    const key = keyFn(item);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  // Round-robin across groups (in random group order) until we reach `count`.
  const groups = shuffleArray([...buckets.values()]);
  const result = [];
  let progressed = true;
  while (result.length < n && progressed) {
    progressed = false;
    for (const g of groups) {
      if (g.length === 0) continue;
      result.push(g.shift());
      progressed = true;
      if (result.length >= n) break;
    }
  }
  return result;
}
