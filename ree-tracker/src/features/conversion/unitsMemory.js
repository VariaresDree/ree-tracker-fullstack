// src/features/conversion/unitsMemory.js
//
// Favourite pairs, recent conversions and how the tiles are sorted, on this device. A convenience: it reads
// as empty if the browser won't store anything.
import { useCallback, useState } from 'react';

const KEY = 'ree:units';
const MAX_HISTORY = 8;

const read = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { favourites: stored.favourites || [], history: stored.history || [], order: stored.order === 'az' ? 'az' : 'groups' };
  } catch {
    return { favourites: [], history: [], order: 'groups' };
  }
};
const write = (value) => {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* a convenience */ }
};
const samePair = (a, b) => a.cat === b.cat && a.from === b.from && a.to === b.to;

export function useUnitsMemory() {
  const [memory, setMemory] = useState(read);
  const update = useCallback((change) => setMemory((current) => {
    const next = change(current);
    write(next);
    return next;
  }), []);

  const remember = useCallback((entry) => update((m) => ({
    ...m,
    history: [entry, ...m.history.filter((h) => !(samePair(h, entry) && h.v === entry.v))].slice(0, MAX_HISTORY),
  })), [update]);
  const toggleFavourite = useCallback((pair) => update((m) => ({
    ...m,
    favourites: m.favourites.some((f) => samePair(f, pair)) ? m.favourites.filter((f) => !samePair(f, pair)) : [...m.favourites, pair],
  })), [update]);
  const clearHistory = useCallback(() => update((m) => ({ ...m, history: [] })), [update]);
  const setOrder = useCallback((order) => update((m) => ({ ...m, order })), [update]);

  return {
    ...memory,
    remember,
    toggleFavourite,
    clearHistory,
    setOrder,
    isFavourite: (cat, from, to) => memory.favourites.some((f) => samePair(f, { cat, from, to })),
  };
}
